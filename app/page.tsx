'use client'

import CompanyModal from './components/CompanyModal'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRef } from 'react'

type CompanyStatus = 'pending' | 'sent' | 'replied' | 'in_progress' | 'passed'
type TabKey = 'all' | CompanyStatus

type CategoryRef = {
  name?: string
}

type Company = {
  id: number | string
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

// Color styles for each status badge
const STATUS_STYLES = {
  pending:     'bg-yellow-100 text-yellow-700',
  sent:        'bg-blue-100 text-blue-700',
  replied:     'bg-purple-100 text-purple-700',
  in_progress: 'bg-orange-100 text-orange-700',
  passed:      'bg-green-100 text-green-700',
}

const STATUS_LABELS = {
  pending:     'Pending',
  sent:        'Sent',
  replied:     'Replied',
  in_progress: 'In Progress',
  passed:      'Passed',
}

const STATUS_ORDER: CompanyStatus[] = ['pending', 'sent', 'replied', 'in_progress', 'passed']
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [preferences, setPreferences] = useState<ProfilePreferences>({
    darkMode: false,
    highContrast: false,
    largeText: false,
  })

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
    fetchCompanies()
  }, [authLoading, currentUserId])

  useEffect(() => {
    const stored = localStorage.getItem(PREFERENCES_KEY)
    if (!stored) return

    const parsed = JSON.parse(stored) as ProfilePreferences
    setPreferences(parsed)
    applyPreferences(parsed)
  }, [])

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

  function toCompanyKey(id: Company['id']) {
    return String(id)
  }

  function toQueryId(idKey: string) {
    const trimmed = idKey.trim()
    if (/^\d+$/.test(trimmed)) return Number(trimmed)
    return trimmed
  }

  async function fetchCompanies() {
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select('*, categories(name)')
      .order('created_at', { ascending: false })

    if (!error) {
      const companies = (data as Company[]) || []
      if (companies.length > 0) {
        console.log(`✅ Fetched ${companies.length} companies`)
        console.log('🔍 First company ID:', companies[0]?.id, 'Type:', typeof companies[0]?.id)
      }
      setCompanies(companies)
    } else {
      console.error('❌ Error fetching companies:', error)
    }
    setLoading(false)
  }

  async function updateStatus(companyId: Company['id'], newStatus: CompanyStatus) {
    const companyKey = toCompanyKey(companyId)
    setUpdatingId(companyKey)
    await supabase
      .from('companies')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', companyId)

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

    await supabase.from('companies').delete().eq('id', companyId)

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

    const targetIds = [...new Set(selectedCompanyIds)].filter(
      (id) => id !== '' && id !== 'null' && id !== 'undefined'
    )
    if (targetIds.length === 0) {
      alert('No valid selected rows to update.')
      return
    }

    const failedUpdates: string[] = []
    for (const idKey of targetIds) {
      const { error } = await supabase
        .from('companies')
        .update({ status: bulkStatus, updated_at: new Date().toISOString() })
        .eq('id', toQueryId(idKey))

      if (error) {
        failedUpdates.push(`${idKey}: ${error.message}`)
      }
    }

    if (failedUpdates.length > 0) {
      alert(`Some status updates failed. First error: ${failedUpdates[0]}`)
    }

    setCompanies((prev) =>
      prev.map((company) =>
        targetIds.includes(toCompanyKey(company.id))
          ? { ...company, status: bulkStatus }
          : company
      )
    )
  }

  async function handleBulkDelete() {
    if (selectedCompanyIds.length === 0) return

    const targetIds = [...new Set(selectedCompanyIds)].filter(
      (id) => id !== '' && id !== 'null' && id !== 'undefined'
    )
    if (targetIds.length === 0) {
      alert('No valid selected rows to delete.')
      return
    }

    const confirmed = window.confirm(
      `Delete ${targetIds.length} selected compan${targetIds.length === 1 ? 'y' : 'ies'}?`
    )
    if (!confirmed) return

    console.log('🔍 Bulk delete - raw IDs:', selectedCompanyIds)
    console.log('🔍 Bulk delete - filtered IDs:', targetIds)
    console.log('🔍 Bulk delete - converted IDs:', targetIds.map(id => ({ original: id, converted: toQueryId(id), type: typeof toQueryId(id) })))

    const failedDeletes: string[] = []
    for (const idKey of targetIds) {
      const queryId = toQueryId(idKey)
      console.log(`📤 Deleting ID: ${idKey} (converted to: ${queryId}, type: ${typeof queryId})`)
      
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', queryId)

      if (error) {
        console.error(`❌ Delete failed for ID ${idKey}:`, error)
        failedDeletes.push(`${idKey}: ${error.message}`)
      } else {
        console.log(`✅ Successfully deleted ID: ${idKey}`)
      }
    }

    if (failedDeletes.length > 0) {
      alert(`Bulk delete failed for some rows. First error: ${failedDeletes[0]}`)
      return
    }

    await fetchCompanies()
    setSelectedCompanyIds([])
    setBulkActionsVisible(false)
  }

  function applyPreferences(next: ProfilePreferences) {
    const root = document.documentElement
    root.classList.toggle('theme-dark', next.darkMode)
    root.classList.toggle('theme-high-contrast', next.highContrast)
    root.classList.toggle('theme-large-text', next.largeText)
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

  const statusChart = useMemo(() => {
    const max = Math.max(...STATUS_ORDER.map((key) => counts[key]), 1)
    return STATUS_ORDER.map((key) => ({
      key,
      label: STATUS_LABELS[key],
      value: counts[key],
      width: `${Math.max((counts[key] / max) * 100, counts[key] > 0 ? 8 : 0)}%`,
    }))
  }, [counts])

  const categoryChart = useMemo(() => {
    const map = new Map<string, number>()
    for (const company of companies) {
      const categoryName = company.categories?.name || 'Uncategorized'
      map.set(categoryName, (map.get(categoryName) || 0) + 1)
    }
    const sorted = [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
    const max = Math.max(...sorted.map((x) => x.value), 1)

    return sorted.map((item) => ({
      ...item,
      width: `${Math.max((item.value / max) * 100, item.value > 0 ? 8 : 0)}%`,
    }))
  }, [companies])

  const weeklyTrend = useMemo(() => {
    const labels: string[] = []
    const values: number[] = []
    const today = new Date()

    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(today)
      day.setDate(today.getDate() - offset)
      const key = day.toISOString().slice(0, 10)
      labels.push(day.toLocaleDateString(undefined, { weekday: 'short' }))
      values.push(companies.filter((company) => company.created_at?.startsWith(key)).length)
    }

    return labels.map((label, index) => ({ label, value: values[index] }))
  }, [companies])

  if (authLoading) {
    return (
      <main className="lento-shell flex items-center justify-center">
        <p className="lento-subtitle">Loading your workspace...</p>
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
              <p className="mt-2 text-lg font-semibold text-teal-900/80">Hi, {currentUserFirstName}!</p>
              <p className="lento-subtitle mt-2">Track outreach, follow-ups, and conversions with a magazine-style command center.</p>
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
                <div className="lento-card absolute right-0 top-14 z-20 w-56 rounded-2xl p-2 shadow-lg">
                  <button
                    onClick={() => {
                      router.push('/profile')
                      setMenuOpen(false)
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-teal-900/80 hover:bg-stone-100"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      router.push('/profile#settings')
                      setMenuOpen(false)
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-teal-900/80 hover:bg-stone-100"
                  >
                    Settings
                  </button>
                  <button
                    onClick={toggleDarkModeFromMenu}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-teal-900/80 hover:bg-stone-100"
                  >
                    Toggle Dark Mode
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`lento-card p-4 text-center transition-all ${
                activeTab === tab.key
                  ? 'border-teal-700 shadow-md'
                  : 'border-teal-900/10 hover:border-teal-900/30'
              }`}
            >
              <p className="text-2xl font-black text-teal-900">{counts[tab.key]}</p>
              <p className="mt-1 text-xs font-semibold text-teal-900/70">{tab.label}</p>
            </button>
          ))}
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lento-card p-5 lg:col-span-1">
            <h2 className="lento-title text-xl">Status Performance</h2>
            <p className="lento-subtitle mt-1">Current funnel spread by outreach stage.</p>
            <div className="mt-4 space-y-3">
              {statusChart.map((item) => (
                <div key={item.key}>
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-teal-900/70">
                    <span>{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-teal-100">
                    <div className="h-full rounded-full bg-teal-700" style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lento-card p-5 lg:col-span-1">
            <h2 className="lento-title text-xl">Category Mix</h2>
            <p className="lento-subtitle mt-1">Top categories by company volume.</p>
            <div className="mt-4 space-y-3">
              {categoryChart.length === 0 ? (
                <p className="text-sm text-teal-900/60">No category data yet.</p>
              ) : (
                categoryChart.map((item) => (
                  <div key={item.name}>
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold text-teal-900/70">
                      <span className="truncate pr-2">{item.name}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-stone-200">
                      <div className="h-full rounded-full bg-emerald-700" style={{ width: item.width }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lento-card p-5 lg:col-span-1">
            <h2 className="lento-title text-xl">Weekly Inflow</h2>
            <p className="lento-subtitle mt-1">Companies added over the last 7 days.</p>
            <div className="mt-4 flex h-40 items-end justify-between gap-2">
              {weeklyTrend.map((item) => {
                const max = Math.max(...weeklyTrend.map((x) => x.value), 1)
                const height = Math.max((item.value / max) * 100, item.value > 0 ? 8 : 4)
                return (
                  <div key={item.label} className="flex w-full flex-col items-center gap-2">
                    <div className="w-full rounded-md bg-teal-700/90" style={{ height: `${height}%` }} />
                    <p className="text-[10px] font-semibold text-teal-900/70">{item.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="lento-card overflow-hidden">
          <div className="flex overflow-x-auto border-b border-teal-900/10 bg-white">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-teal-700 text-teal-800'
                    : 'text-teal-900/60 hover:text-teal-800'
                }`}
              >
                {tab.label}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-stone-100 text-teal-900/60'
                }`}>
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          <div className="border-b border-teal-900/10 p-4">
            <input
              type="text"
              placeholder="Search company name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-teal-900/20 bg-stone-50 px-4 py-2 text-sm text-teal-900 placeholder:text-teal-900/40 focus:outline-none focus:ring-2 focus:ring-teal-600"
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
                    className="rounded-xl border border-teal-900/20 bg-stone-50 px-3 py-2 text-sm text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
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
                    className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Delete Selected
                  </button>
                  <span className="text-xs font-semibold text-teal-900/60">
                    {selectedCompanyIds.length} selected
                  </span>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-teal-900/60">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-teal-900/60">
              <p className="text-4xl mb-3">☕</p>
              <p className="font-medium">No companies here yet</p>
              <p className="text-sm mt-1">Import some companies to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-stone-100 text-teal-900/60 text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAllFiltered}
                        className="h-4 w-4"
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
                <tbody className="divide-y divide-teal-900/5 bg-white">
                  {filtered.map((company) => (
                    <tr key={company.id} className="transition-colors hover:bg-teal-50/50">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCompanyIds.includes(String(company.id))}
                          onChange={() => toggleSelectCompany(company.id)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-teal-900">{company.company_name}</p>
                        {company.contact_person && (
                          <p className="mt-0.5 text-xs text-teal-900/50">{company.contact_person}</p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-[220px] truncate text-teal-900/70">{company.email}</p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="lento-pill">
                          {company.categories?.name || '—'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[company.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[company.status] || company.status}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={company.status}
                          onChange={(e) => updateStatus(company.id, e.target.value as CompanyStatus)}
                          disabled={updatingId === String(company.id)}
                          className="rounded-lg border border-teal-900/20 bg-stone-50 px-2 py-1 text-xs text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:opacity-50"
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
                            className="rounded-lg bg-stone-100 px-3 py-1 text-xs text-teal-900/80 transition-colors hover:bg-teal-100 hover:text-teal-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteCompany(company.id, company.company_name)}
                            className="rounded-lg bg-stone-100 px-3 py-1 text-xs text-teal-900/80 transition-colors hover:bg-red-100 hover:text-red-700"
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
    await supabase
      .from('companies')
      .update({ notes: note })
      .eq('id', company.id)
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
          className="border border-blue-300 rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-400"
          autoFocus
        />
        <button
          onClick={saveNote}
          disabled={saving}
          className="rounded bg-teal-800 px-2 py-1 text-xs text-white"
        >
          {saving ? '...' : 'Save'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs text-teal-900/40 hover:text-teal-900/70"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-left text-xs text-teal-900/40 transition-colors hover:text-teal-800"
    >
      {note || '+ Add note'}
    </button>
  )
}