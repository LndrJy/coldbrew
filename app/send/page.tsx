'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Category = {
  id: number
  name: string
}

type Company = {
  id: string
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
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [accessToken, setAccessToken] = useState('')
  const [subject, setSubject] = useState(DEFAULT_SUBJECT)
  const [body, setBody] = useState(DEFAULT_BODY)
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<SendResult[]>([])
  const [filterCategory, setFilterCategory] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null)

  const fetchData = useCallback(async () => {
    const { data: cats } = await supabase.from('categories').select('*')
    setCategories((cats as Category[]) || [])

    const { data: comps } = await supabase
      .from('companies')
      .select('*, categories(name)')
      .eq('owner_id', currentUserId)
      .eq('status', 'pending')
    setCompanies((comps as Company[]) || [])
  }, [currentUserId])

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) router.replace('/auth')
      else {
        setCurrentUserId(session.user.id)
        setAccessToken(session.access_token)
      }
      setAuthLoading(false)
    }

    checkSession()
  }, [router])

  useEffect(() => {
    if (authLoading || !currentUserId) return
    const timer = window.setTimeout(() => {
      void fetchData()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [authLoading, currentUserId, fetchData])

  if (authLoading) {
    return (
      <main className="lento-shell flex items-center justify-center">
        <p className="lento-subtitle">Loading email workspace...</p>
      </main>
    )
  }

  // Filter companies by category
  const filtered = filterCategory
    ? companies.filter((c) => String(c.category_id) === filterCategory)
    : companies

  function toggleSelect(id: string) {
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
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          to: company.email.trim(),
          companyId: company.id,
          ownerId: currentUserId,
          companyName: company.company_name,
          subject,
          body: personalizedBody,
          attachment: attachedFile,
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
        <div className="mb-8">
          <h1 className="lento-title mb-2">☕ SEND EMAILS</h1>
          <p className="lento-subtitle">Compose email and send applications</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 lento-button-ghost"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT: Company Selection */}
          <div className="lento-card p-6">
            <h2 className="mb-4 text-lg font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>
              1. SELECT COMPANIES ({selectedCompanies.length} selected)
            </h2>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full mb-3 px-3 py-2 text-sm"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* Select All */}
            <button
              onClick={toggleSelectAll}
              className="lento-button-ghost mb-3 text-sm w-full"
            >
              {selectedCompanies.length === filtered.length ? 'DESELECT ALL' : 'SELECT ALL'}
            </button>

            {/* Company List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--ink)]/60">
                  No pending companies. Import some first!
                </p>
              ) : (
                filtered.map((company) => (
                  <label
                    key={company.id}
                    className="flex cursor-pointer items-start gap-3 border-2 border-[var(--ink)] bg-[var(--background)] p-3 transition-all hover:translate-x-1"
                    style={{ boxShadow: '3px 3px 0px var(--ink)' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.id)}
                      onChange={() => toggleSelect(company.id)}
                      className="neo-checkbox mt-1"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Space Mono' }}>
                        {company.company_name}
                      </p>
                      <p className="truncate font-mono text-xs text-[var(--ink)]/60">{company.email}</p>
                      {company.categories?.name && (
                        <span className="mt-1 inline-block border-2 border-[var(--ink)] px-2 py-1 text-xs font-bold text-[var(--ink)]" style={{ boxShadow: '2px 2px 0px var(--ink)' }}>
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
          <div className="lento-card p-6">
            <h2 className="mb-4 text-lg font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>
              2. COMPOSE EMAIL
            </h2>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>
                Body
              </label>
              <p className="mb-2 font-mono text-xs text-[var(--ink)]/60">
                Use [Company Name] to auto-personalize each email
              </p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 text-sm font-mono"
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>
                Attach Resume (optional)
              </label>
              <div className="border-2 border-dashed border-[var(--ink)] p-4 text-center" style={{ backgroundColor: 'var(--background)' }}>
                {attachedFile ? (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Space Mono' }}>📎 {attachedFile.name}</p>
                      <p className="mt-1 text-xs text-[var(--ink)]/60">Ready to send with all emails</p>
                    </div>
                    <button
                      onClick={() => setAttachedFile(null)}
                      className="lento-button-ghost text-sm px-3 py-2"
                    >
                      REMOVE FILE
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <p className="text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>
                      📁 Click to attach file
                    </p>
                    <p className="mt-1 font-mono text-xs text-[var(--ink)]/60">
                      PDF, DOC, DOCX (max 5MB)
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            alert('File too large. Max 5MB.')
                            return
                          }
                          const reader = new FileReader()
                          reader.onload = (event) => {
                            const content = event.target?.result as string
                            setAttachedFile({ name: file.name, content })
                          }
                          reader.readAsDataURL(file)
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Send Button */}
        <div className="mt-6">
          <button
            onClick={handleSendEmails}
            disabled={sending || selectedCompanies.length === 0}
            className={`w-full font-bold py-4 transition-all text-lg lento-button ${
              sending || selectedCompanies.length === 0
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
          >
            {sending
              ? `Sending... (${results.length}/${selectedCompanies.length})`
              : `Send to ${selectedCompanies.length} Companies`}
          </button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 lento-card p-6">
            <h2 className="mb-4 text-lg font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>
              SEND RESULTS
            </h2>
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="border-b-2 border-[var(--ink)]/20 py-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Space Mono' }}>
                        {r.company}
                      </p>
                      <p className="font-mono text-xs text-[var(--ink)]/60">{r.email}</p>
                    </div>
                    <span className="text-sm font-bold whitespace-nowrap">{r.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}