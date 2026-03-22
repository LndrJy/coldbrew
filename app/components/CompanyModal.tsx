'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type CompanyStatus = 'pending' | 'sent' | 'replied' | 'in_progress' | 'passed'

type Category = {
  id: number
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
  category_id?: number | null
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
  category_id: number | ''
}

type CompanyModalProps = {
  company: CompanyInput | null
  ownerId: string
  onClose: () => void
  onSave: () => void
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
    category_id: company?.category_id ?? '',
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
      [name]: name === 'category_id' ? (value === '' ? '' : Number(value)) : value,
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

    if (isEditing) {
      // UPDATE existing company
      const { error } = await supabase
        .from('companies')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', company.id)

      if (error) setError(error.message)
      else onSave()
    } else {
      // CREATE new company
      const { error } = await supabase
        .from('companies')
        .insert({ ...form })

      if (error) setError(error.message)
      else onSave()
    }

    setSaving(false)
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal Box */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {isEditing ? '✏️ Edit Company' : '➕ Add Company'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g. Accenture Philippines"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="hr@company.com"
            />
          </div>

          {/* Category + Status row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Category</label>
              <select
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Select —</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              <label className="block text-sm font-medium text-gray-600 mb-1">Contact Person</label>
              <input
                type="text"
                name="contact_person"
                value={form.contact_person}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Position</label>
              <input
                type="text"
                name="position"
                value={form.position}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. HR Manager"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g. BGC, Taguig City"
            />
          </div>

          {/* Industry + Programs row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Industry</label>
              <input
                type="text"
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. Technology"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Programs Offered</label>
              <input
                type="text"
                name="programs_offered"
                value={form.programs_offered}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="e.g. CS, IT"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Any additional notes..."
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-medium disabled:bg-gray-300"
          >
            {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Company'}
          </button>
        </div>

      </div>
    </div>
  )
}