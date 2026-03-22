'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type ProfilePreferences = {
  darkMode: boolean
  highContrast: boolean
  largeText: boolean
}

const PREFERENCES_KEY = 'coldbrew.profile.preferences'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [gender, setGender] = useState('')
  const [email, setEmail] = useState('')

  const [preferences, setPreferences] = useState<ProfilePreferences>({
    darkMode: false,
    highContrast: false,
    largeText: false,
  })

  useEffect(() => {
    async function bootstrap() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/auth')
        return
      }

      setEmail(session.user.email || '')
      setFirstName((session.user.user_metadata.first_name as string) || '')
      setLastName((session.user.user_metadata.last_name as string) || '')
      setBirthday((session.user.user_metadata.birthday as string) || '')
      setGender((session.user.user_metadata.gender as string) || '')

      const stored = localStorage.getItem(PREFERENCES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ProfilePreferences
        setPreferences(parsed)
        applyPreferences(parsed)
      }

      setLoading(false)
    }

    bootstrap()
  }, [router])

  function applyPreferences(next: ProfilePreferences) {
    const root = document.documentElement
    root.classList.toggle('theme-dark', next.darkMode)
    root.classList.toggle('theme-high-contrast', next.highContrast)
    root.classList.toggle('theme-large-text', next.largeText)
  }

  function updatePreference<K extends keyof ProfilePreferences>(key: K, value: ProfilePreferences[K]) {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    applyPreferences(next)
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next))
  }

  async function handleSaveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birthday,
        gender,
      },
    })

    setSaving(false)
    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Profile updated successfully.')
  }

  if (loading) {
    return (
      <main className="lento-shell flex items-center justify-center">
        <p className="lento-subtitle">Loading profile...</p>
      </main>
    )
  }

  return (
    <main className="lento-shell px-6 py-8 md:px-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="lento-card p-6">
          <h1 className="lento-title text-4xl">Profile & Settings</h1>
          <p className="lento-subtitle mt-2">Manage your account details and accessibility preferences.</p>
        </header>

        <form onSubmit={handleSaveProfile} className="lento-card p-6">
          <h2 className="lento-title text-2xl">Account</h2>
          <p className="mt-1 text-sm text-teal-900/65">Email: {email || 'Not available'}</p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-teal-900/80">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-teal-900/20 bg-stone-50 px-4 py-2 text-sm text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-teal-900/80">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-teal-900/20 bg-stone-50 px-4 py-2 text-sm text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-teal-900/80">Birthday</label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full rounded-xl border border-teal-900/20 bg-stone-50 px-4 py-2 text-sm text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-teal-900/80">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full rounded-xl border border-teal-900/20 bg-stone-50 px-4 py-2 text-sm text-teal-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="">Select gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non_binary">Non-binary</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {message && (
            <p className="mt-4 rounded-xl border border-teal-900/10 bg-teal-50 px-3 py-2 text-sm text-teal-900/80">
              {message}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="lento-button">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <button type="button" onClick={() => router.push('/')} className="lento-button-ghost">
              Back to Dashboard
            </button>
          </div>
        </form>

        <section className="lento-card p-6">
          <h2 className="lento-title text-2xl">Accessibility & Appearance</h2>
          <p className="lento-subtitle mt-1">Customize your viewing experience.</p>

          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between rounded-xl border border-teal-900/10 bg-stone-50 px-4 py-3">
              <span className="text-sm font-semibold text-teal-900/80">Dark Mode</span>
              <input
                type="checkbox"
                checked={preferences.darkMode}
                onChange={(e) => updatePreference('darkMode', e.target.checked)}
                className="h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-teal-900/10 bg-stone-50 px-4 py-3">
              <span className="text-sm font-semibold text-teal-900/80">High Contrast</span>
              <input
                type="checkbox"
                checked={preferences.highContrast}
                onChange={(e) => updatePreference('highContrast', e.target.checked)}
                className="h-4 w-4"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-teal-900/10 bg-stone-50 px-4 py-3">
              <span className="text-sm font-semibold text-teal-900/80">Larger Text</span>
              <input
                type="checkbox"
                checked={preferences.largeText}
                onChange={(e) => updatePreference('largeText', e.target.checked)}
                className="h-4 w-4"
              />
            </label>
          </div>
        </section>
      </div>
    </main>
  )
}
