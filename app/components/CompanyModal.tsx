'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type CompanyStatus = 'pending' | 'sent' | 'replied' | 'in_progress' | 'passed'

type Category = {
  id: number | string
  name: string
}

type CompanyInput = {
  id: number | string
  company_name?: string | null
  email?: string | null
  address?: string | null
  industry?: string | null
  programs_offered?: string | null
  contact_person?: string | null
  position?: string | null
  status?: CompanyStatus | null
  notes?: string | null
  category_id?: number | string | null
}

type CompanyForm = {
  company_name: string
  email: string
  address: string
  industry: string
  programs_offered: string
  contact_person: string
  position: string
  status: CompanyStatus
  notes: string
  category_id: string
}

type CompanyModalProps = {
  company: CompanyInput | null
  ownerId: string
  onClose: () => void
  onSave: () => void
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeUuid(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

function normalizeCategoryId(value: unknown): string {
  if (value === '' || value === null || value === undefined) return ''
  return String(value).trim()
}

export default function CompanyModal({ company, ownerId, onClose, onSave }: CompanyModalProps) {
  // If 'company' is passed in, we're EDITING. If null, we're CREATING.
  const isEditing = !!company

  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state — pre-fill with company data if editing
  const [form, setForm] = useState<CompanyForm>({
    company_name: company?.company_name || '',
    email: company?.email || '',
    address: company?.address || '',
    industry: company?.industry || '',
    programs_offered: company?.programs_offered || '',
    contact_person: company?.contact_person || '',
    position: company?.position || '',
    status: company?.status || 'pending',
    notes: company?.notes || '',
    category_id: normalizeCategoryId(company?.category_id),
  })

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('*')
      setCategories((data as Category[]) || [])
    }
    fetchCategories()
  }, [])

  // Generic handler for all form fields
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'category_id' ? normalizeCategoryId(value) : value,
    }))
  }

  async function handleSubmit() {
    // Basic validation
    if (!form.company_name.trim()) {
      setError('Company name is required.')
      return
    }
    if (!form.email.trim()) {
      setError('Email is required.')
      return
    }

    setSaving(true)
    setError('')

    const normalizedOwnerId = normalizeUuid(ownerId)
    if (!isUuid(normalizedOwnerId)) {
      setSaving(false)
      setError('Your session is not ready. Please refresh and try again.')
      return
    }

    if (isEditing) {
      const normalizedCompanyId = normalizeUuid(company?.id)
      if (!isUuid(normalizedCompanyId)) {
        setSaving(false)
        setError('Invalid company ID. Please refresh and try again.')
        return
      }

      const payload = {
        ...form,
        category_id: form.category_id === '' ? null : form.category_id,
        updated_at: new Date().toISOString(),
      }

      // UPDATE existing company
      const { error } = await supabase
        .from('companies')
        .update(payload)
        .eq('id', normalizedCompanyId)
        .eq('owner_id', normalizedOwnerId)

      if (error) setError(error.message)
      else onSave()
    } else {
      const payload = {
        ...form,
        category_id: form.category_id === '' ? null : form.category_id,
        owner_id: normalizedOwnerId,
      }

      // CREATE new company
      const { error } = await supabase
        .from('companies')
        .insert(payload)

      if (error) setError(error.message)
      else onSave()
    }

    setSaving(false)
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal Box */}
      <div className="lento-card w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--ink)]/20 p-6">
          <h2 className="text-lg font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>
            {isEditing ? '✏️ Edit Company' : '➕ Add Company'}
          </h2>
          <button
            onClick={onClose}
            className="text-xl font-bold text-[var(--ink)]/55 hover:text-[var(--ink)]"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">

          {/* Error Message */}
          {error && (
            <div className="border border-[var(--accent)] bg-[var(--panel)] px-4 py-2 text-sm text-[var(--accent)]">
              {error}
            </div>
          )}

          {/* Company Name */}
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>
              Company Name <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              type="text"
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm"
              placeholder="e.g. Accenture Philippines"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>
              Email Address <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm"
              placeholder="hr@company.com"
            />
          </div>

          {/* Category + Status row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>Category</label>
              <select
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm"
              >
                <option value="">— Select —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="replied">Replied</option>
                <option value="in_progress">In Progress</option>
                <option value="passed">Passed</option>
              </select>
            </div>
          </div>

          {/* Contact Person + Position row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>Contact Person</label>
              <input
                type="text"
                name="contact_person"
                value={form.contact_person}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm"
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>Position</label>
              <input
                type="text"
                name="position"
                value={form.position}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm"
                placeholder="e.g. HR Manager"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>Address</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm"
              placeholder="e.g. BGC, Taguig City"
            />
          </div>

          {/* Industry + Programs row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>Industry</label>
              <input
                type="text"
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm"
                placeholder="e.g. Technology"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>Programs Offered</label>
              <input
                type="text"
                name="programs_offered"
                value={form.programs_offered}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm"
                placeholder="e.g. CS, IT"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Archivo Black' }}>Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 text-sm"
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 border-t border-[var(--ink)]/20 p-6">
          <button
            onClick={onClose}
            className="lento-button-ghost flex-1 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="lento-button flex-1 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Company'}
          </button>
        </div>

      </div>
    </div>
  )
}