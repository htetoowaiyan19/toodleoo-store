import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../utils/useAuth'
import { useTheme } from '../utils/useTheme'
import { formatCurrency } from '../utils/format'
import { clearUserNotifications, deleteNotification, subscribeUserCollection } from '../services/storeService'
import { Trash2, X } from 'lucide-react'


export function AccountPage() {
  const { isAdmin, isOwner, profile, signOutUser, user } = useAuth()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const [notifications, setNotifications] = useState([])

  // QoL Preference settings (stored in localStorage)
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('toodleoo_preferences')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // ignore fallback
      }
    }
    return {
      emailAlerts: true,
      inAppAlerts: true,
      autoCopyNumber: true,
      compactCurrency: false,
    }
  })

  useEffect(() => {
    localStorage.setItem('toodleoo_preferences', JSON.stringify(preferences))
  }, [preferences])

  useEffect(
    () => subscribeUserCollection('notifications', user.id, setNotifications),
    [user.id],
  )

  function togglePref(key) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const roleLabel = isOwner ? 'Owner' : isAdmin ? 'Staff Admin' : 'Customer'
  const roleBadgeColor = isOwner
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
    : isAdmin
      ? 'bg-[#0b7e74]/10 text-[#0b7e74] border border-[#0b7e74]/20'
      : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20'

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* USER PROFILE HEADER */}
      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#0fa697] to-[#ff655b] text-2xl font-black text-white shadow-md">
              {(profile?.displayName || user.email)?.slice(0, 2)?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black">{profile?.displayName || 'User'}</h1>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${roleBadgeColor}`}>
                  {roleLabel}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOutUser}
            className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-full bg-rose-500/10 px-5 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white dark:text-rose-400 sm:self-auto"
          >
            <svg className="h-4 w-4 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>

        {/* QUICK NAVIGATION CARDS */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link
            to="/wallet"
            className="group rounded-2xl border border-black/5 bg-neutral-50 p-5 transition hover:border-[#0b7e74] hover:shadow-md dark:border-white/5 dark:bg-neutral-950/60"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Wallet Balance
            </p>
            <p className="mt-2 text-2xl font-black text-[#0b7e74]">
              {formatCurrency(profile?.walletBalance || 0)}
            </p>
            <span className="mt-2 inline-block text-xs font-bold text-neutral-400 group-hover:underline">
              Topup / View Wallet →
            </span>
          </Link>

          <Link
            to="/orders"
            className="group rounded-2xl border border-black/5 bg-neutral-50 p-5 transition hover:border-[#0b7e74] hover:shadow-md dark:border-white/5 dark:bg-neutral-950/60"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              My Purchases
            </p>
            <p className="mt-2 text-2xl font-black">View Orders</p>
            <span className="mt-2 inline-block text-xs font-bold text-neutral-400 group-hover:underline">
              Check delivery messages →
            </span>
          </Link>

          {isAdmin ? (
            <Link
              to="/admin"
              className="group rounded-2xl border border-black/5 bg-neutral-50 p-5 transition hover:border-[#0b7e74] hover:shadow-md dark:border-white/5 dark:bg-neutral-950/60"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Admin Panel
              </p>
              <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
                Operations
              </p>
              <span className="mt-2 inline-block text-xs font-bold text-neutral-400 group-hover:underline">
                Manage store & payments →
              </span>
            </Link>
          ) : (
            <div className="rounded-2xl border border-black/5 bg-neutral-50 p-5 dark:border-white/5 dark:bg-neutral-950/60">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Member Status
              </p>
              <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
                Verified Account
              </p>
              <span className="mt-2 inline-block text-xs font-semibold text-neutral-400">
                Protected by Supabase Auth
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SETTINGS & PREFERENCES SECTION */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* PREFERENCES SETTINGS PANEL */}
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:p-8">
          <div className="border-b border-black/5 pb-4 dark:border-white/5">
            <h2 className="text-xl font-black">Account Settings & Preferences</h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Customize your theme, notification preferences, and purchasing preferences.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            {/* THEME SWITCHER */}
            <div className="flex flex-col gap-4 rounded-2xl border border-black/5 bg-neutral-50 p-5 dark:border-white/5 dark:bg-neutral-950/60 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold">Appearance Theme</p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Switch between Light Mode and Dark Mode interface themes.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start rounded-full border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-neutral-900 sm:self-auto">
                <button
                  type="button"
                  onClick={() => isDarkMode && toggleDarkMode()}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    !isDarkMode
                      ? 'bg-neutral-950 text-white shadow-sm'
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  ☀️ Light
                </button>
                <button
                  type="button"
                  onClick={() => !isDarkMode && toggleDarkMode()}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                    isDarkMode
                      ? 'bg-white text-neutral-950 shadow-sm'
                      : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  🌙 Dark
                </button>
              </div>
            </div>

            {/* QOL SETTING: NOTIFICATION PREFERENCES */}
            <div className="space-y-4 rounded-2xl border border-black/5 bg-neutral-50 p-5 dark:border-white/5 dark:bg-neutral-950/60">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                Notification Settings
              </h3>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">In-App Notifications</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Receive order status and wallet update alerts in your dashboard.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.inAppAlerts}
                  onChange={() => togglePref('inAppAlerts')}
                  className="h-5 w-5 cursor-pointer rounded accent-[#0b7e74]"
                />
              </div>

              <div className="flex items-center justify-between border-t border-black/5 pt-3 dark:border-white/5">
                <div>
                  <p className="text-sm font-bold">Email Notifications</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Receive receipt reviews and delivery messages in your email.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.emailAlerts}
                  onChange={() => togglePref('emailAlerts')}
                  className="h-5 w-5 cursor-pointer rounded accent-[#0b7e74]"
                />
              </div>
            </div>

            {/* QOL SETTING: PAYMENT PREFERENCES */}
            <div className="space-y-4 rounded-2xl border border-black/5 bg-neutral-50 p-5 dark:border-white/5 dark:bg-neutral-950/60">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                Purchasing Quality-of-Life Settings
              </h3>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Auto-Copy Admin E-Wallet Phone Number</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Automatically copy KPay/WavePay phone numbers upon selecting manual payment.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.autoCopyNumber}
                  onChange={() => togglePref('autoCopyNumber')}
                  className="h-5 w-5 cursor-pointer rounded accent-[#0b7e74]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS FEED SIDEBAR */}
        <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-black/5 pb-4 dark:border-white/5">
            <div>
              <h2 className="text-lg font-black">Notifications Feed</h2>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {notifications.length} Total Alerts
              </span>
            </div>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (user?.id) {
                    await clearUserNotifications(user.id)
                    setNotifications([])
                  }
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white dark:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All
              </button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs font-medium text-neutral-400">
                No recent notifications found.
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="group relative flex items-start justify-between gap-2 rounded-2xl border border-black/5 bg-neutral-50 p-4 transition hover:bg-neutral-100 dark:border-white/5 dark:bg-neutral-950/60 dark:hover:bg-neutral-950"
                >
                  <div>
                    <p className="text-xs font-black text-[#0b7e74]">{notification.title}</p>
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">
                      {notification.message}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await deleteNotification(notification.id)
                        setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
                      } catch (err) {
                        console.error('Failed to delete notification:', err)
                      }
                    }}
                    title="Delete notification"
                    className="shrink-0 rounded-lg p-1 text-neutral-400 opacity-80 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </section>
  )
}
