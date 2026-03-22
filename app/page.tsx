'use client'

import CompanyModal from './components/CompanyModal'
import CoffeePourLoader from './components/CoffeePourLoader'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRef } from 'react'

type CompanyStatus = 'pending' | 'sent' | 'replied' | 'in_progress' | 'passed'
type TabKey = 'all' | CompanyStatus

type CategoryRef = {
  name?: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Company = {
  id: string
  company_name: string | null
  contact_person: string | null
  email: string | null
  status: CompanyStatus
  notes: string | null
  address?: string | null
  industry?: string | null
  programs_offered?: string | null
  position?: string | null
  category_id?: number | null
  categories?: CategoryRef | null
  created_at?: string | null
}

type Tab = {
  key: TabKey
  label: string
  color: string
}

type ProfilePreferences = {
  darkMode: boolean
  highContrast: boolean
  largeText: boolean
}

// Tab definitions
const TABS: Tab[] = [
  { key: 'all',         label: 'All',         color: 'gray' },
  { key: 'pending',     label: 'Pending',     color: 'yellow' },
  { key: 'sent',        label: 'Sent',        color: 'blue' },
  { key: 'replied',     label: 'Replied',     color: 'purple' },
  { key: 'in_progress', label: 'In Progress', color: 'orange' },
  { key: 'passed',      label: 'Passed',      color: 'green' },
]

const STATUS_STYLES = {
  pending:     'border border-[var(--ink)] text-[var(--ink)]',
  sent:        'border border-[var(--ink)] text-[var(--ink)]',
  replied:     'border border-[var(--ink)] text-[var(--ink)]',
  in_progress: 'border border-[var(--ink)] text-[var(--ink)]',
  passed:      'border border-[var(--ink)] text-[var(--ink)]',
}

const STATUS_LABELS = {
  pending:     'Pending',
  sent:        'Sent',
  replied:     'Replied',
  in_progress: 'In Progress',
  passed:      'Passed',
}

const PREFERENCES_KEY = 'coldbrew.profile.preferences'

export default function Dashboard() {
  const router = useRouter()
  const [authLoading, setAuthLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState('')
  const [currentUserFirstName, setCurrentUserFirstName] = useState('there')
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState<CompanyStatus>('pending')
  const [bulkActionsVisible, setBulkActionsVisible] = useState(false)
  const [bulkStatusLoading, setBulkStatusLoading] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [preferences, setPreferences] = useState<ProfilePreferences>({
    darkMode: false,
    highContrast: false,
    largeText: false,
  })

  const toCompanyKey = useCallback((id: Company['id']) => String(id).trim().toLowerCase(), [])

  const isUuid = useCallback((idKey: string) => UUID_PATTERN.test(idKey), [])

  const applyPreferences = useCallback((next: ProfilePreferences) => {
    const root = document.documentElement
    root.classList.toggle('theme-dark', next.darkMode)
    root.classList.toggle('theme-high-contrast', next.highContrast)
    root.classList.toggle('theme-large-text', next.largeText)
  }, [])

  const fetchCompanies = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select('*, categories(name)')
      .eq('owner_id', currentUserId)
      .order('created_at', { ascending: false })

    if (!error) {
      const companies = ((data as Company[]) || []).map((company) => ({
        ...company,
        id: toCompanyKey(company.id),
      }))
      setCompanies(companies)
    }
    setLoading(false)
  }, [currentUserId, toCompanyKey])

  useEffect(() => {
    async function bootstrapAuth() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/auth')
      } else {
        setCurrentUserId(session.user.id)
        setCurrentUserFirstName((session.user.user_metadata.first_name as string) || 'there')
      }

      setAuthLoading(false)
    }

    bootstrapAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/auth')
      else {
        setCurrentUserId(session.user.id)
        setCurrentUserFirstName((session.user.user_metadata.first_name as string) || 'there')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  useEffect(() => {
    if (authLoading || !currentUserId) return
    const timer = window.setTimeout(() => {
      void fetchCompanies()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [authLoading, currentUserId, fetchCompanies])

  useEffect(() => {
    const stored = localStorage.getItem(PREFERENCES_KEY)
    if (!stored) return

    const parsed = JSON.parse(stored) as ProfilePreferences
    applyPreferences(parsed)

    const timer = window.setTimeout(() => {
      setPreferences(parsed)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [applyPreferences])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuOpen) return
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  async function updateStatus(companyId: Company['id'], newStatus: CompanyStatus) {
    const companyKey = toCompanyKey(companyId)
    setUpdatingId(companyKey)
    await supabase
      .from('companies')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', companyKey)
      .eq('owner_id', currentUserId)

    setCompanies((prev) =>
      prev.map((c) => toCompanyKey(c.id) === companyKey ? { ...c, status: newStatus } : c)
    )
    setUpdatingId(null)
  }

  async function deleteCompany(companyId: Company['id'], companyName: string | null) {
    const companyKey = toCompanyKey(companyId)
    const confirmed = window.confirm(
      `Are you sure you want to delete "${companyName || 'this company'}"? This cannot be undone.`
    )
    if (!confirmed) return

    await supabase.from('companies').delete().eq('id', companyKey).eq('owner_id', currentUserId)

    setCompanies((prev) => prev.filter((c) => toCompanyKey(c.id) !== companyKey))
    setSelectedCompanyIds((prev) => prev.filter((id) => id !== companyKey))
  }

  function toggleSelectCompany(companyId: Company['id']) {
    const companyKey = toCompanyKey(companyId)
    setSelectedCompanyIds((prev) =>
      prev.includes(companyKey)
        ? prev.filter((id) => id !== companyKey)
        : [...prev, companyKey]
    )
  }

  function toggleSelectAllFiltered() {
    const filteredIds = filtered.map((company) => toCompanyKey(company.id))
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedCompanyIds.includes(id))

    if (allSelected) {
      setSelectedCompanyIds((prev) => prev.filter((id) => !filteredIds.includes(id)))
      setBulkActionsVisible(false)
    } else {
      setSelectedCompanyIds((prev) => [...new Set([...prev, ...filteredIds])])
      setBulkActionsVisible(true)
    }
  }

  async function handleBulkStatusUpdate() {
    if (selectedCompanyIds.length === 0) return

    const normalizedSelection = selectedCompanyIds.map((id) => toCompanyKey(id))
    const targetIds = [...new Set(normalizedSelection)].filter((id) => isUuid(id))
    if (targetIds.length === 0) {
      alert('No valid UUID rows selected to update.')
      return
    }

    setBulkStatusLoading(true)
    try {
      const failedUpdates: string[] = []
      for (const idKey of targetIds) {
        const { error } = await supabase
          .from('companies')
          .update({ status: bulkStatus, updated_at: new Date().toISOString() })
          .eq('id', idKey)
          .eq('owner_id', currentUserId)

        if (error) {
          failedUpdates.push(
            `${idKey}: ${error.message}${error.code ? ` (code: ${error.code})` : ''}${error.details ? ` | details: ${error.details}` : ''}${error.hint ? ` | hint: ${error.hint}` : ''}`
          )
        }
      }

      if (failedUpdates.length > 0) {
        alert(`Some status updates failed. First error: ${failedUpdates[0]}`)
      }

      await fetchCompanies()
      setSelectedCompanyIds([])
      setBulkActionsVisible(false)
      router.refresh()
    } finally {
      setBulkStatusLoading(false)
    }
  }

  async function handleBulkDelete() {
    if (selectedCompanyIds.length === 0) return

    const normalizedSelection = selectedCompanyIds.map((id) => toCompanyKey(id))
    const targetIds = [...new Set(normalizedSelection)].filter((id) => isUuid(id))
    if (targetIds.length === 0) {
      alert('No valid UUID rows selected to delete.')
      return
    }

    const confirmed = window.confirm(
      `Delete ${targetIds.length} selected compan${targetIds.length === 1 ? 'y' : 'ies'}?`
    )
    if (!confirmed) return

    setBulkDeleteLoading(true)
    try {
      const failedDeletes: string[] = []
      for (const idKey of targetIds) {
        const { error } = await supabase
          .from('companies')
          .delete()
          .eq('id', idKey)
          .eq('owner_id', currentUserId)

        if (error) {
          failedDeletes.push(
            `${idKey}: ${error.message}${error.code ? ` (code: ${error.code})` : ''}${error.details ? ` | details: ${error.details}` : ''}${error.hint ? ` | hint: ${error.hint}` : ''}`
          )
        }
      }

      if (failedDeletes.length > 0) {
        alert(`Bulk delete failed for some rows. First error: ${failedDeletes[0]}`)
        return
      }

      await fetchCompanies()
      setSelectedCompanyIds([])
      setBulkActionsVisible(false)
      router.refresh()
    } finally {
      setBulkDeleteLoading(false)
    }
  }

  function toggleDarkModeFromMenu() {
    const next = { ...preferences, darkMode: !preferences.darkMode }
    setPreferences(next)
    applyPreferences(next)
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next))
    setMenuOpen(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/auth')
  }

  const filtered = companies
    .filter((c) => activeTab === 'all' || c.status === activeTab)
    .filter((c) =>
      search === '' ||
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    )

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((company) => selectedCompanyIds.includes(toCompanyKey(company.id)))

  const counts = TABS.reduce<Record<TabKey, number>>((acc, tab) => {
    acc[tab.key] = tab.key === 'all'
      ? companies.length
      : companies.filter((c) => c.status === tab.key).length
    return acc
  }, { all: 0, pending: 0, sent: 0, replied: 0, in_progress: 0, passed: 0 })

  const conversionFunnel = useMemo(() => {
    const stages = [
      { key: 'pending', label: 'Emails Sent' },
      { key: 'sent', label: 'Opened' },
      { key: 'replied', label: 'Replied' },
      { key: 'in_progress', label: 'Technical Assessment' },
      { key: 'passed', label: 'Offer' },
    ] as const

    const stageCounts = stages.map((stage) => ({
      ...stage,
      value: counts[stage.key as CompanyStatus] || 0,
    }))

    const baselineCount = Math.max(counts.pending || 1, 1)
    return stageCounts.map((stage) => {
      const percent = (stage.value / baselineCount) * 100
      return {
        ...stage,
        percent: Math.round(percent),
      }
    })
  }, [counts])

  const activityOverTime = useMemo(() => {
    const dayData = new Map<string, { sent: number; replied: number }>()
    const today = new Date()

    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(today)
      day.setDate(today.getDate() - offset)
      const dateKey = day.toISOString().slice(0, 10)
      const dayLabel = day.toLocaleDateString(undefined, { weekday: 'short' })

      const sent = companies.filter((c) => c.created_at?.startsWith(dateKey)).length
      const replied = companies.filter((c) => c.status === 'replied' && c.created_at?.startsWith(dateKey)).length

      dayData.set(dayLabel, { sent, replied })
    }

    return Array.from(dayData.entries()).map(([label, data]) => ({
      label,
      sent: data.sent,
      replied: data.replied,
    }))
  }, [companies])

  if (authLoading || bulkDeleteLoading || bulkStatusLoading) {
    return (
      <main className="lento-shell flex flex-col items-center justify-center gap-4">
        <CoffeePourLoader size={150} />
        <p className="lento-subtitle">
          {bulkDeleteLoading
            ? 'Removing selected companies...'
            : bulkStatusLoading
              ? 'Updating selected statuses...'
              : 'Loading your workspace...'}
        </p>
      </main>
    )
  }

  return (
    <main className="lento-shell">
      <div className="mx-auto max-w-6xl px-6 py-6 md:px-8 md:py-8">
        <header className="lento-card mb-6 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="lento-title mt-3 text-4xl md:text-5xl">ColdBrew Dashboard</h1>
              <p className="mt-2 text-lg font-semibold text-[var(--ink)]/80">Hi, {currentUserFirstName}!</p>
              <p className="lento-subtitle mt-2">Track outreach, follow-ups, and conversions.</p>
            </div>
            <div ref={menuRef} className="relative flex flex-wrap gap-2">
              <button onClick={() => router.push('/import')} className="lento-button-ghost">+ Import Excel</button>
              <button
                onClick={() => {
                  setEditingCompany(null)
                  setShowModal(true)
                }}
                className="lento-button-ghost"
              >
                + Add Manually
              </button>
              <button onClick={() => router.push('/send')} className="lento-button">✉ Send Emails</button>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="lento-button-ghost"
                aria-label="Open user menu"
              >
                ☰
              </button>

              {menuOpen && (
                <div className="lento-card absolute right-0 top-14 z-20 w-56 p-2">
                  <button
                    onClick={() => {
                      router.push('/profile')
                      setMenuOpen(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm font-semibold text-[var(--ink)] hover:bg-black/5"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      router.push('/profile#settings')
                      setMenuOpen(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm font-semibold text-[var(--ink)] hover:bg-black/5"
                  >
                    Settings
                  </button>
                  <button
                    onClick={toggleDarkModeFromMenu}
                    className="w-full px-3 py-2 text-left text-sm font-semibold text-[var(--ink)] hover:bg-black/5"
                  >
                    Toggle Dark Mode
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-left text-sm font-semibold text-[var(--accent)] hover:bg-black/5"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="lento-card mb-6 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-6">
            {TABS.map((tab, index) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`p-4 text-center transition-colors ${
                  index < TABS.length - 1 ? 'border-r border-[var(--ink)]/30' : ''
                } ${
                  activeTab === tab.key
                    ? 'bg-[var(--accent)] text-[var(--background)]'
                    : 'bg-transparent text-[var(--ink)] hover:bg-black/5'
                }`}
              >
                <p className="text-2xl font-black">{counts[tab.key]}</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide">{tab.label}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="lento-card p-5">
            <h2 className="lento-title text-xl">Application Progress</h2>
            <p className="lento-subtitle mt-1">breakdown of applications currently standing.</p>
            <div className="mt-4 space-y-3">
              {conversionFunnel.map((stage) => (
                <div key={stage.key}>
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-[var(--ink)]/70">
                    <span>{stage.label}</span>
                    <span className="text-[var(--ink)]">{stage.value}</span>
                  </div>
                  <div className="h-2 border border-[var(--ink)]/25 bg-transparent">
                    <div
                      className="h-full"
                      style={{
                        backgroundColor: 'var(--accent)',
                        width: `${Math.max(stage.percent, 5)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-0.5 text-[10px] text-[var(--ink)]/55">{stage.percent}% of baseline</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lento-card p-5">
            <h2 className="lento-title text-xl">Activity Over Time</h2>
            <p className="lento-subtitle mt-1">Sent vs replied.</p>
            {activityOverTime.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--ink)]/60">No data yet.</p>
            ) : (() => {
              const totalSent = activityOverTime.reduce((sum, day) => sum + day.sent, 0)
              const totalReplied = activityOverTime.reduce((sum, day) => sum + day.replied, 0)
              const total = totalSent + totalReplied || 1
              const sentPercent = Math.round((totalSent / total) * 100)
              const repliedPercent = 100 - sentPercent

              return (
                <div className="mt-4 flex flex-col items-center gap-6">
                  <div className="flex h-40 w-40 items-center justify-center rounded-full" style={{
                    background: `conic-gradient(from 0deg, var(--accent) 0deg ${(sentPercent / 100) * 360}deg, color-mix(in srgb, var(--accent) 34%, transparent) ${(sentPercent / 100) * 360}deg 360deg)`,
                  }}>
                    <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full" style={{ backgroundColor: 'var(--background)' }}>
                      <p className="text-2xl font-black text-[var(--ink)]">{totalSent}</p>
                      <p className="text-[10px] font-semibold text-[var(--ink)]/60">sent</p>
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 border border-[var(--ink)]" style={{ backgroundColor: 'var(--accent)' }} />
                        <span className="font-semibold text-[var(--ink)]/70">Sent</span>
                      </div>
                      <span className="text-[var(--ink)]">{totalSent} ({sentPercent}%)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 border border-[var(--ink)]" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 34%, transparent)' }} />
                        <span className="font-semibold text-[var(--ink)]/70">Replied</span>
                      </div>
                      <span className="text-[var(--ink)]">{totalReplied} ({repliedPercent}%)</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </section>

        <section className="lento-card overflow-hidden">
          <div className="flex overflow-x-auto border-b border-[var(--ink)]/30 bg-transparent">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-[var(--accent)] text-[var(--ink)]'
                    : 'text-[var(--ink)]/60 hover:text-[var(--ink)]'
                }`}
              >
                {tab.label}
                <span className={`ml-2 border border-[var(--ink)] px-2 py-0.5 text-xs ${
                  activeTab === tab.key
                    ? 'bg-[var(--accent)] text-[var(--background)]'
                    : 'bg-transparent text-[var(--ink)]/60'
                }`}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          <div className="border-b border-[var(--ink)]/30 p-4">
            <input
              type="text"
              placeholder="Search company name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 text-sm placeholder:text-[var(--ink)]/40"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={toggleSelectAllFiltered} className="lento-button-ghost">
                {allFilteredSelected ? 'Unselect All' : 'Select All'}
              </button>

              {bulkActionsVisible && (
                <>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value as CompanyStatus)}
                    className="px-3 py-2 text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="sent">Sent</option>
                    <option value="replied">Replied</option>
                    <option value="in_progress">In Progress</option>
                    <option value="passed">Passed</option>
                  </select>
                  <button
                    onClick={handleBulkStatusUpdate}
                    disabled={selectedCompanyIds.length === 0}
                    className="lento-button disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Update Selected
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedCompanyIds.length === 0}
                    className="lento-button-ghost disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete Selected
                  </button>
                  <span className="text-xs font-semibold text-[var(--ink)]/60">
                    {selectedCompanyIds.length} selected
                  </span>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-[var(--ink)]/60">
              <CoffeePourLoader size={120} className="mx-auto mb-2" />
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-[var(--ink)]/60">
              <p className="text-4xl mb-3">☕</p>
              <p className="font-medium">No companies here yet</p>
              <p className="text-sm mt-1">Import some companies to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[var(--ink)]/70 text-xs uppercase" style={{ backgroundColor: 'var(--panel)' }}>
                  <tr>
                    <th className="px-5 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        className="neo-checkbox"
                      />
                    </th>
                    <th className="px-5 py-3 text-left">Company</th>
                    <th className="px-5 py-3 text-left">Email</th>
                    <th className="px-5 py-3 text-left">Category</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-left">Update Status</th>
                    <th className="px-5 py-3 text-left">Notes</th>
                    <th className="px-5 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ink)]/15 bg-transparent">
                  {filtered.map((company) => (
                    <tr key={company.id} className="transition-colors hover:bg-black/5">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCompanyIds.includes(toCompanyKey(company.id))}
                          onChange={() => toggleSelectCompany(company.id)}
                          className="neo-checkbox"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-[var(--ink)]">{company.company_name}</p>
                        {company.contact_person && (
                          <p className="mt-0.5 text-xs text-[var(--ink)]/50">{company.contact_person}</p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-[220px] truncate text-[var(--ink)]/70">{company.email}</p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="lento-pill">
                          {company.categories?.name || '—'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 text-xs font-medium ${STATUS_STYLES[company.status] || 'border border-[var(--ink)] text-[var(--ink)]'}`}>
                          {STATUS_LABELS[company.status] || company.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={company.status}
                          onChange={(e) => updateStatus(company.id, e.target.value as CompanyStatus)}
                          disabled={updatingId === String(company.id)}
                          className="px-2 py-1 text-xs disabled:opacity-50"
                        >
                          <option value="pending">Pending</option>
                          <option value="sent">Sent</option>
                          <option value="replied">Replied</option>
                          <option value="in_progress">In Progress</option>
                          <option value="passed">Passed</option>
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <NoteCell company={company} onUpdate={fetchCompanies} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCompany(company)
                              setShowModal(true)
                            }}
                            className="lento-button-ghost px-3 py-1 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteCompany(company.id, company.company_name)}
                            className="lento-button px-3 py-1 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showModal && (
        <CompanyModal
          company={editingCompany}
          ownerId={currentUserId}
          onClose={() => {
            setShowModal(false)
            setEditingCompany(null)
          }}
          onSave={() => {
            setShowModal(false)
            setEditingCompany(null)
            fetchCompanies()
          }}
        />
      )}
    </main>
  )
}

type NoteCellProps = {
  company: Company
  onUpdate: () => Promise<void>
}

function NoteCell({ company, onUpdate }: NoteCellProps) {
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(company.notes || '')
  const [saving, setSaving] = useState(false)

  async function saveNote() {
    setSaving(true)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      setSaving(false)
      return
    }

    await supabase
      .from('companies')
      .update({ notes: note })
      .eq('id', company.id)
      .eq('owner_id', session.user.id)
    setSaving(false)
    setEditing(false)
    onUpdate()
  }

  if (editing) {
    return (
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && saveNote()}
          className="px-2 py-1 text-xs w-32"
          autoFocus
        />
        <button
          onClick={saveNote}
          disabled={saving}
          className="lento-button px-2 py-1 text-xs"
        >
          {saving ? '...' : 'Save'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-[var(--ink)]/40 hover:text-[var(--ink)]/70"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left text-xs text-[var(--ink)]/40 transition-colors hover:text-[var(--ink)]"
    >
      {note || '+ Add note'}
    </button>
  )
}