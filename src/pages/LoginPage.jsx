import { useState } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../utils/useAuth'
import { useTranslation } from '../utils/useTranslation'

function formatAuthError(error, t) {
  if (!error) return ''
  const message = error.message || String(error)
  const lower = message.toLowerCase()

  if (lower.includes('invalid login credentials')) {
    return t('auth.errors.invalidCredentials')
  }
  if (lower.includes('user not found') || lower.includes('email not found')) {
    return t('auth.errors.userNotFound')
  }
  if (lower.includes('invalid password') || lower.includes('wrong password')) {
    return t('auth.errors.wrongPassword')
  }
  if (
    lower.includes('user already registered') ||
    lower.includes('already exists')
  ) {
    return t('auth.errors.alreadyRegistered')
  }
  if (lower.includes('password should be at least')) {
    return t('auth.errors.passwordTooShort')
  }
  if (lower.includes('email not confirmed')) {
    return t('auth.errors.emailNotConfirmed')
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return t('auth.errors.rateLimit')
  }

  return t('auth.errors.generic') || message
}

export function LoginPage() {
  const { signInWithGoogle, signInWithPassword, signUpWithPassword, user } =
    useAuth()
  const { t } = useTranslation()
  const [isSignup, setIsSignup] = useState(false)
  const [form, setForm] = useState({ displayName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) return <Navigate to="/account" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      if (isSignup) {
        await signUpWithPassword(form)
      } else {
        await signInWithPassword(form.email, form.password)
      }
    } catch (caughtError) {
      setError(formatAuthError(caughtError, t))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setIsSubmitting(true)
    try {
      await signInWithGoogle()
    } catch (caughtError) {
      setError(formatAuthError(caughtError, t))
      setIsSubmitting(false)
    }
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div>
        <p className="font-bold text-[#0b7e74]">{t('auth.secureAccount')}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-black">
          {isSignup ? t('auth.signUpTitle') : t('auth.signInTitle')}
        </h1>
        <p className="mt-4 text-xs sm:text-sm text-neutral-600 dark:text-white/60 leading-relaxed">
          {isSignup ? t('auth.signUpSubtitle') : t('auth.signInSubtitle')}
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900"
      >
        {isSignup && (
          <label className="block text-xs sm:text-sm font-bold">
            {t('auth.name')}
            <input
              value={form.displayName}
              onChange={(event) =>
                setForm({ ...form, displayName: event.target.value })
              }
              placeholder={t('auth.namePlaceholder')}
              className="mt-2 w-full rounded-lg border border-black/10 px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-colors focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950 dark:focus:border-[#0b7e74]"
              required
            />
          </label>
        )}
        <label className={`${isSignup ? 'mt-4' : ''} block text-xs sm:text-sm font-bold`}>
          {t('auth.email')}
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder={t('auth.emailPlaceholder')}
            className="mt-2 w-full rounded-lg border border-black/10 px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-colors focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950 dark:focus:border-[#0b7e74]"
            required
          />
        </label>
        <label className="mt-4 block text-xs sm:text-sm font-bold">
          {t('auth.password')}
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm({ ...form, password: event.target.value })
            }
            placeholder={t('auth.passwordPlaceholder')}
            className="mt-2 w-full rounded-lg border border-black/10 px-3.5 py-2.5 text-xs sm:text-sm outline-none transition-colors focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950 dark:focus:border-[#0b7e74]"
            required
          />
        </label>

        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-600 dark:text-red-400">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 fill-current"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-6 w-full cursor-pointer rounded-lg bg-[#0b7e74] px-5 py-3 font-bold text-white transition-all duration-200 hover:bg-[#09665e] hover:shadow-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 text-xs sm:text-sm"
        >
          {isSubmitting
            ? t('common.loading')
            : isSignup
              ? t('auth.createAccount')
              : t('auth.signIn')}
        </button>

        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleGoogleSignIn}
          className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-black/10 px-5 py-2.5 font-bold transition-all duration-200 hover:border-black/30 hover:bg-neutral-100 hover:shadow-sm active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:hover:border-white/30 dark:hover:bg-neutral-800 text-xs sm:text-sm"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {t('auth.continueGoogle')}
        </button>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setError('')
              setIsSignup((value) => !value)
            }}
            className="cursor-pointer font-bold text-xs sm:text-sm text-[#0b7e74] transition-colors hover:text-[#09665e] hover:underline"
          >
            {isSignup ? t('auth.alreadyHaveAccount') : t('auth.createAccountLink')}
          </button>
        </div>
      </form>
    </section>
  )
}


