'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'

type PreviewRow = Record<string, unknown>

export default function ImportPage() {
  const router = useRouter()
  const [authLoading, setAuthLoading] = useState(true)
  const [selectedProgramKey, setSelectedProgramKey] = useState('')
  const [previewData, setPreviewData] = useState<PreviewRow[]>([])
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) router.replace('/auth')
      setAuthLoading(false)
    }

    checkSession()
  }, [router])

  function getProgramsOfferedValue(row: PreviewRow) {
    return String(
      row['Programs offered'] ??
      row['Programs Offered'] ??
      row['Program Offered'] ??
      ''
    ).trim()
  }

  function normalizeProgramValue(rawValue: string) {
    const tokens = rawValue
      .split(',')
      .map((token) => token.trim().toUpperCase())
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))

    if (tokens.length === 0) {
      return { key: '', label: '' }
    }

    return {
      key: tokens.join('|'),
      label: tokens.join(', '),
    }
  }

  const programOptions = useMemo(() => {
    const values = new Map<string, string>()
    for (const row of previewData) {
      const normalized = normalizeProgramValue(getProgramsOfferedValue(row))
      if (normalized.key) values.set(normalized.key, normalized.label)
    }
    return [...values.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [previewData])

  const filteredPreviewData = useMemo(() => {
    if (!selectedProgramKey) return previewData
    return previewData.filter((row) => {
      const normalized = normalizeProgramValue(getProgramsOfferedValue(row))
      return normalized.key === selectedProgramKey
    })
  }, [previewData, selectedProgramKey])

  if (authLoading) {
    return (
      <main className="lento-shell flex items-center justify-center">
        <p className="lento-subtitle">Loading import workspace...</p>
      </main>
    )
  }

  // Runs when user picks a file
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    const reader = new FileReader()

    reader.onload = (event) => {
      const fileBinary = event.target?.result
      if (typeof fileBinary !== 'string') return

      // Parse the Excel file
      const workbook = XLSX.read(fileBinary, { type: 'binary' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]

      // Convert sheet to array of objects
      const jsonData = XLSX.utils.sheet_to_json(sheet) as PreviewRow[]
      setPreviewData(jsonData)
      setSelectedProgramKey('')
    }

    reader.readAsBinaryString(file)
  }

  // Runs when user clicks Import button
  async function handleImport() {
    const rowsToImport = previewData.filter((row) => {
      if (!selectedProgramKey) return true
      const normalized = normalizeProgramValue(getProgramsOfferedValue(row))
      return normalized.key === selectedProgramKey
    })

    if (rowsToImport.length === 0) {
      setMessage('⚠️ No filtered data to import!')
      return
    }

    setImporting(true)
    setMessage('')

    // Shape the data for Supabase
    const rows = rowsToImport.map((row) => ({
      company_name: String(row['Company '] || row['Company'] || ''),
      email: String(row['Email Address'] || ''),
      address: String(row['Address'] || ''),
      industry: String(row['Industry'] || ''),
      programs_offered: String(row['Programs offered'] || ''),
      contact_person: String(row['Contact Person'] || ''),
      position: String(row['Position'] || ''),
      effectivity_date: String(row['Effectivity Date'] || ''),
      moa_status: String(row['MOA Status'] || ''),
      status: 'pending',
    }))

    const { error } = await supabase.from('companies').insert(rows)

    if (error) {
      setMessage('❌ Import failed: ' + error.message)
    } else {
      setMessage(`✅ Successfully imported ${rows.length} companies!`)
      setTimeout(() => router.push('/'), 1500)
    }

    setImporting(false)
  }

  return (
    <main className="lento-shell p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">☕ Import Companies</h1>
          <p className="text-gray-500 mt-1">Upload your Excel file to get started</p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">1. Upload Excel File</h2>

          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0 file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />

          {fileName && (
            <p className="mt-2 text-sm text-green-600 font-medium">📄 {fileName} loaded</p>
          )}
        </div>

        {/* Program Selector */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">2. Filter by Program Offered</h2>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-semibold text-gray-700">Program Offered Filter (optional)</label>
            <select
              value={selectedProgramKey}
              onChange={(e) => setSelectedProgramKey(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              disabled={programOptions.length === 0}
            >
              <option value="">All Programs</option>
              {programOptions.map((program) => (
                <option key={program.key} value={program.key}>
                  {program.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview Table */}
        {previewData.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              3. Preview ({filteredPreviewData.length} of {previewData.length} rows)
            </h2>

            <table className="w-full text-sm text-left text-gray-600">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                <tr>
                  {Object.keys(previewData[0]).map((col) => (
                    <th key={col} className="px-4 py-2">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPreviewData.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="px-4 py-2">{String(val ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPreviewData.length > 5 && (
              <p className="text-xs text-gray-400 mt-2">
                Showing first 5 of {filteredPreviewData.length} rows
              </p>
            )}
          </div>
        )}

        {/* Message */}
        {message && (
          <p className="mb-4 text-sm font-medium text-center">{message}</p>
        )}

        {/* Import Button */}
        <button
          onClick={handleImport}
          disabled={importing || filteredPreviewData.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300
            text-white font-bold py-3 rounded-xl transition-colors"
        >
          {importing ? 'Importing...' : `Import ${filteredPreviewData.length} Companies`}
        </button>

      </div>
    </main>
  )
}