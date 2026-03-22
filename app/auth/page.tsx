'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type AuthMode = 'login' | 'signup' | 'forgot'
type PasswordStrength = 'weak' | 'moderate' | 'strong'

function evaluatePasswordStrength(value: string): PasswordStrength {
  let score = 0
  if (value.length >= 8) score += 1
  if (/[A-Z]/.test(value)) score += 1
  if (/[a-z]/.test(value)) score += 1
  if (/[0-9]/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1

  if (score >= 4) return 'strong'
  if (score >= 3) return 'moderate'
  return 'weak'
}

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [gender, setGender] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [failedAttemptsByEmail, setFailedAttemptsByEmail] = useState<Record<string, number>>({})
  const [shakeMessage, setShakeMessage] = useState(false)
  const [isPasswordTyping, setIsPasswordTyping] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) router.replace('/')
    }

    checkSession()
  }, [router])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setShakeMessage(false)

    const normalizedEmail = email.trim().toLowerCase()
    const currentFailedAttempts = failedAttemptsByEmail[normalizedEmail] || 0

    if (!normalizedEmail) {
      setLoading(false)
      setMessage('Please enter your email.')
      return
    }

    if (mode !== 'forgot' && password.length < 6) {
      setLoading(false)
      setMessage('Password must be at least 6 characters.')
      return
    }

    if (mode === 'signup') {
      if (!firstName.trim() || !lastName.trim() || !birthday || !gender) {
        setLoading(false)
        setMessage('Please complete all required profile fields.')
        setShakeMessage(true)
        return
      }

      if (password !== confirmPassword) {
        setLoading(false)
        setMessage('Password confirmation does not match.')
        setShakeMessage(true)
        return
      }
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      if (error) {
        const wrongPassword = /invalid login credentials/i.test(error.message)
        if (wrongPassword) {
          const nextAttempts = currentFailedAttempts + 1
          setFailedAttemptsByEmail((prev) => ({
            ...prev,
            [normalizedEmail]: nextAttempts,
          }))
          const remaining = Math.max(4 - nextAttempts, 0)
          setMessage(
            remaining > 0
              ? `Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} left before Reset unlocks.`
              : 'Incorrect password. Reset is now unlocked for this account.'
          )
          setShakeMessage(true)
        } else {
          setMessage(error.message)
          setShakeMessage(true)
        }
      } else {
        setFailedAttemptsByEmail((prev) => ({ ...prev, [normalizedEmail]: 0 }))
        router.replace('/')
      }
    }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            birthday,
            gender,
          },
        },
      })
      if (error) setMessage(error.message)
      else {
        setMessage('Account created. You can now login.')
        setMode('login')
      }
    }

    if (mode === 'forgot') {
      if (currentFailedAttempts < 4) {
        setMessage('Reset unlocks only after 4 incorrect password attempts.')
        setShakeMessage(true)
        setLoading(false)
        return
      }
      const redirectTo = `${window.location.origin}/auth/reset`
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo })
      if (error) setMessage(error.message)
      else setMessage('Password reset link sent to your email.')
    }

    setLoading(false)
  }

  const title =
    mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Your Account' : 'Reset Password'
  const activeEmailKey = email.trim().toLowerCase()
  const failedAttempts = failedAttemptsByEmail[activeEmailKey] || 0
  const isResetUnlocked = failedAttempts >= 4
  const passwordStrength = evaluatePasswordStrength(password)
  const strengthPercent = passwordStrength === 'strong' ? 100 : passwordStrength === 'moderate' ? 66 : 33
  const resolvedMode: AuthMode = mode === 'forgot' && !isResetUnlocked ? 'login' : mode

  return (
    <main className="lento-shell flex items-center justify-center px-6 py-10">
      <div className="lento-card w-full max-w-xl rounded-2xl p-10">
        <h1 className="lento-title mt-4 text-4xl">{title}</h1>
        <p className="lento-subtitle mt-2">
          {resolvedMode === 'forgot'
            ? 'Send a secure reset link to your inbox.'
            : 'Manage your ColdBrew outreach workspace with your own account.'}
        </p>

        <div className={`mt-6 grid gap-2 rounded-2xl border border-[var(--ink)]/20 p-2 ${isResetUnlocked || resolvedMode === 'forgot' ? 'grid-cols-3' : 'grid-cols-2'}`} style={{ backgroundColor: 'var(--panel)' }}>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              resolvedMode === 'login' ? 'bg-[var(--accent)] text-[var(--background)]' : 'text-[var(--ink)]/70 hover:bg-black/5'
            }`}
            style={{ fontFamily: 'Space Mono' }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              resolvedMode === 'signup' ? 'bg-[var(--accent)] text-[var(--background)]' : 'text-[var(--ink)]/70 hover:bg-black/5'
            }`}
            style={{ fontFamily: 'Space Mono' }}
          >
            Sign Up
          </button>
          {(isResetUnlocked || resolvedMode === 'forgot') && (
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className={`lento-reveal-up rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                resolvedMode === 'forgot' ? 'bg-[var(--accent)] text-[var(--background)]' : 'text-[var(--ink)]/70 hover:bg-black/5'
              }`}
              style={{ fontFamily: 'Space Mono' }}
            >
              Reset
            </button>
          )}
        </div>

        {!isResetUnlocked && resolvedMode === 'login' && email.trim() && (
          <p className="mt-3 text-xs font-semibold text-[var(--ink)]/65">
            Reset unlocks after 4 incorrect password attempts for this account. Current: {failedAttempts}/4
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Space Mono' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-2 text-sm placeholder:text-[var(--ink)]/45"
              placeholder="you@example.com"
              required
            />
          </div>

          {resolvedMode !== 'forgot' && (
            <div>
              <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Space Mono' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setIsPasswordTyping(true)}
                onBlur={() => setIsPasswordTyping(false)}
                className="w-full rounded-xl px-4 py-2 text-sm placeholder:text-[var(--ink)]/45"
                placeholder="Minimum 6 characters"
                required
              />
              {resolvedMode === 'signup' && isPasswordTyping && password.length > 0 && (
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full border border-[var(--ink)]/20" style={{ backgroundColor: 'var(--panel)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        backgroundColor:
                          passwordStrength === 'strong'
                            ? 'var(--accent)'
                            : passwordStrength === 'moderate'
                              ? 'color-mix(in srgb, var(--accent) 70%, var(--ink))'
                              : 'color-mix(in srgb, var(--ink) 70%, transparent)',
                        width: `${strengthPercent}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs font-semibold">
                    <span className="text-[var(--ink)]/65">Strength:</span>
                    <span style={{ color: passwordStrength === 'weak' ? 'var(--ink)' : 'var(--accent)' }}>
                      {passwordStrength.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {resolvedMode === 'signup' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Space Mono' }}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl px-4 py-2 text-sm placeholder:text-[var(--ink)]/45"
                  placeholder="Re-enter password"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Space Mono' }}>First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl px-4 py-2 text-sm placeholder:text-[var(--ink)]/45"
                    placeholder="Juan"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Space Mono' }}>Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl px-4 py-2 text-sm placeholder:text-[var(--ink)]/45"
                    placeholder="Dela Cruz"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Space Mono' }}>Birthday</label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full rounded-xl px-4 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-[var(--ink)]" style={{ fontFamily: 'Space Mono' }}>Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl px-4 py-2 text-sm"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {message && (
            <p className={`rounded-xl border border-[var(--ink)]/20 bg-[var(--panel)] px-3 py-2 text-sm text-[var(--ink)]/80 ${shakeMessage ? 'lento-shake' : ''}`}>
              {message}
            </p>
          )}

          <button type="submit" disabled={loading} className="lento-button w-full py-3 text-base" style={{ fontFamily: 'Space Mono' }}>
            {loading ? 'Please wait...' : resolvedMode === 'login' ? 'Login' : resolvedMode === 'signup' ? 'Create Account' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </main>
  )
}
