'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Category = {
  id: number
  name: string
}

type Company = {
  id: number
  company_name: string
  email: string
  category_id: number | null
  categories?: {
    name?: string
  } | null
}

type SendResult = {
  company: string
  email: string
  success: boolean
  message: string
}

// Default email template
const DEFAULT_SUBJECT = 'OJT Application – [Your School Name]'
const DEFAULT_BODY = `Dear HR Manager / Recruitment Team,

I hope this message finds you well. I am a student from [Your School Name] currently seeking an On-the-Job Training (OJT) placement for [Semester/Period].

I am writing to inquire about the possibility of completing my OJT at [Company Name]. Our program requires [number] hours of training, and I am confident that your company would provide an excellent learning environment.

I have attached my resume and other required documents for your reference. I would greatly appreciate the opportunity to discuss this further at your convenience.

Thank you for your time and consideration.

Respectfully,
[Your Name]
[Course & Year Level]
[Contact Number]
[School Name]`

export default function SendEmailPage() {
  const router = useRouter()
  const [authLoading, setAuthLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([])
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<SendResult[]>([])
  const [filterCategory, setFilterCategory] = useState('')
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) router.replace('/auth')
      else setCurrentUserId(session.user.id)
      setAuthLoading(false)
    }

    checkSession()
  }, [router])

  useEffect(() => {
    if (authLoading || !currentUserId) return
    fetchData()
  }, [authLoading, currentUserId])

  if (authLoading) {
    return (
      <main className="lento-shell flex items-center justify-center">
        <p className="lento-subtitle">Loading email workspace...</p>
      </main>
    )
  }

  async function fetchData() {
    const { data: cats } = await supabase.from('categories').select('*')
    setCategories((cats as Category[]) || [])

    const { data: comps } = await supabase
      .from('companies')
      .select('*, categories(name)')
      .eq('status', 'pending')  // only show pending companies
    setCompanies((comps as Company[]) || [])
  }

  // Filter companies by category
  const filtered = filterCategory
    ? companies.filter((c) => String(c.category_id) === filterCategory)
    : companies

  function toggleSelect(id: number) {
    setSelectedCompanies((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    if (selectedCompanies.length === filtered.length) {
      setSelectedCompanies([])
    } else {
      setSelectedCompanies(filtered.map((c) => c.id))
    }
  }

  async function handleSendEmails() {
    if (selectedCompanies.length === 0) {
      alert('Please select at least one company!')
      return
    }

    setSending(true)
    setResults([])

    const toSend = companies.filter((c) => selectedCompanies.includes(c.id))

    for (const company of toSend) {
      // Personalize the body for each company
      const personalizedBody = body.replace(/\[Company Name\]/g, company.company_name)

      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: company.email.trim(),
          companyId: company.id,
          ownerId: currentUserId,
          companyName: company.company_name,
          subject,
          body: personalizedBody,
        }),
      })

      const result = (await res.json()) as { error?: { message?: string } | string }

      const errorMessage =
        typeof result.error === 'string'
          ? result.error
          : result.error?.message || 'Unknown error'

      setResults((prev) => [
        ...prev,
        {
          company: company.company_name,
          email: company.email,
          success: res.ok,
          message: res.ok ? '✅ Sent!' : `❌ Failed: ${errorMessage}`,
        },
      ])

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    setSending(false)
    // Refresh company list after sending
    fetchData()
  }

  return (
    <main className="lento-shell p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">☕ Send Emails</h1>
            <p className="text-gray-500 mt-1">Compose and send OJT applications</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT: Company Selection */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              1. Select Companies ({selectedCompanies.length} selected)
            </h2>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* Select All */}
            <button
              onClick={toggleSelectAll}
              className="text-sm text-blue-600 hover:underline mb-3 block"
            >
              {selectedCompanies.length === filtered.length ? 'Deselect All' : 'Select All'}
            </button>

            {/* Company List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  No pending companies. Import some first!
                </p>
              ) : (
                filtered.map((company) => (
                  <label
                    key={company.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.id)}
                      onChange={() => toggleSelect(company.id)}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 text-sm truncate">
                        {company.company_name}
                      </p>
                      <p className="text-gray-400 text-xs truncate">{company.email}</p>
                      {company.categories?.name && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {company.categories.name}
                        </span>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: Email Composer */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">2. Compose Email</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Body
                <span className="text-gray-400 font-normal ml-2">
                  (use [Company Name] to auto-personalize)
                </span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Send Button */}
        <div className="mt-6">
          <button
            onClick={handleSendEmails}
            disabled={sending || selectedCompanies.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300
              text-white font-bold py-4 rounded-xl transition-colors text-lg"
          >
            {sending
              ? `Sending... (${results.length}/${selectedCompanies.length})`
              : `Send to ${selectedCompanies.length} Companies`}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Results</h2>
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.company}</p>
                    <p className="text-xs text-gray-400">{r.email}</p>
                  </div>
                  <span className="text-sm">{r.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}