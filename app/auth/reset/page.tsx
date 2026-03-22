'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleUpdatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Password updated successfully. Redirecting...')
      setTimeout(() => router.replace('/'), 1200)
    }

    setLoading(false)
  }

  return (
    <main className="lento-shell flex items-center justify-center px-6 py-10">
      <div className="lento-card w-full max-w-lg p-8">
        <p className="lento-pill inline-block">Security</p>
        <h1 className="lento-title mt-4 text-4xl">Set New Password</h1>
        <p className="lento-subtitle mt-2">Create a new password for your ColdBrew account.</p>

        <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-teal-900/80">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-teal-900/20 bg-stone-50 px-4 py-2 text-sm text-teal-900 placeholder:text-teal-900/40 focus:outline-none focus:ring-2 focus:ring-teal-600"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-teal-900/80">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-teal-900/20 bg-stone-50 px-4 py-2 text-sm text-teal-900 placeholder:text-teal-900/40 focus:outline-none focus:ring-2 focus:ring-teal-600"
              required
            />
          </div>

          {message && (
            <p className="rounded-xl border border-teal-900/10 bg-teal-50 px-3 py-2 text-sm text-teal-900/80">{message}</p>
          )}

          <button type="submit" disabled={loading} className="lento-button w-full py-3 text-base">
            {loading ? 'Updating...' : 'Update Password'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/auth')}
            className="lento-button-ghost w-full py-3 text-base"
          >
            Back to Login
          </button>
        </form>
      </div>
    </main>
  )
}
