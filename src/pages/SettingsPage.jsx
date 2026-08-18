import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../utils/useAuth'
import { useTheme } from '../utils/useTheme'
import { useTranslation } from '../utils/useTranslation'
import {
  clearUserNotifications,
  deleteNotification,
  subscribeUserCollection,
} from '../services/storeService'
import { ContactMethodsEditor } from '../components/account/ContactMethodsEditor'
import { getUserSubscription } from '../utils/subscriptionPlans'
import {
  Settings,
  Sun,
  Moon,
  Trash2,
  X,
  ArrowLeft,
  Crown,
  Sparkles,
  Shield,
  Bell,
  User,
  LogOut,
  ChevronRight,
  Wallet,
  Package,
  ShieldCheck,
  Languages,
  Check,
} from 'lucide-react'

export function SettingsPage() {
  const { isAdmin, isOwner, profile, signOutUser, user, updateProfile, refreshProfile } = useAuth()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const { t, language, setLanguage, isBurmese } = useTranslation()
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [isSavingContacts, setIsSavingContacts] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const subData = getUserSubscription(profile)

  const roleLabel = isOwner ? 'Owner' : isAdmin ? 'Administrator' : 'Customer'
  const roleBadgeColor = isOwner
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
    : isAdmin
      ? 'bg-[#0b7e74]/10 text-[#0b7e74] border border-[#0b7e74]/20'
      : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20'

  // Subscribe to user notifications
  useEffect(() => {
    if (!user) return
    return subscribeUserCollection('notifications', user.id, setNotifications)
  }, [user?.id])

  // Preferences state
  const [preferences, setPreferences] = useState(() => {
    const saved = localStorage.getItem('toodleoo_preferences')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error(e)
      }
    }
    return {
      emailAlerts: true,
      inAppAlerts: true,
      autoCopyNumber: true,
    }
  })

  function togglePref(key) {
    setPreferences((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('toodleoo_preferences', JSON.stringify(next))
      return next
    })
  }

  async function handleSaveContactMethods(methods) {
    setIsSavingContacts(true)
    setFeedback(null)
    try {
      if (updateProfile) {
        await updateProfile({ contactMethods: methods })
      }
      if (refreshProfile) {
        await refreshProfile()
      }
      setFeedback({ type: 'success', message: t('common.saved') })
      setTimeout(() => setFeedback(null), 3000)
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || t('common.error') })
    } finally {
      setIsSavingContacts(false)
    }
  }

  async function handleSignOut() {
    await signOutUser()
    navigate('/')
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* BREADCRUMB & BACK LINK */}
      <div className="flex items-center justify-between">
        <Link
          to="/account"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-[#0b7e74] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t('settings.backToAccount')}</span>
        </Link>
      </div>

      {/* PAGE TITLE HERO CARD */}
      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#0fa697] to-[#ff655b] text-xl font-black text-white shadow-sm">
              {(profile?.displayName || user?.email)?.slice(0, 2)?.toUpperCase() || 'TD'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">{profile?.displayName || 'User'}</h1>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${roleBadgeColor}`}>
                  {roleLabel}
                </span>
                {subData.tier !== 'free' && subData.isActive && (
                  <span
                    title={subData.plan.name}
                    className={`rounded-md border px-1.5 py-0.5 sm:px-2 text-[11px] font-bold flex items-center gap-1 shrink-0 ${subData.tier === 'stellar'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                      : subData.tier === 'lunar_plus'
                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400'
                        : 'bg-[#0b7e74]/10 border-[#0b7e74]/20 text-[#0b7e74] dark:text-[#67dccf]'
                      }`}
                  >
                    {subData.tier === 'stellar' ? (
                      <Crown className="h-3 w-3" />
                    ) : subData.tier === 'lunar_plus' ? (
                      <Sparkles className="h-3 w-3" />
                    ) : (
                      <Moon className="h-3 w-3" />
                    )}
                    <span
                      className={
                        subData.tier === 'stellar'
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent font-bold'
                          : ''
                      }
                    >
                      {subData.plan.name}
                    </span>
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-lg p-3 text-xs font-bold ${feedback.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
            }`}
        >
          {feedback.message}
        </div>
      )}

      {/* MAIN SETTINGS GRID */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* PREFERENCES PANEL */}
        <div className="rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-5">
          <div className="border-b border-black/5 pb-3.5 dark:border-white/5">
            <h2 className="text-base sm:text-lg font-black">{t('settings.preferencesTitle')}</h2>
          </div>

          {/* LANGUAGE SELECTOR */}
          <div className="flex flex-col gap-3 rounded-lg border border-black/5 bg-neutral-50 p-4 dark:border-white/5 dark:bg-neutral-950/60 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-[#0b7e74]" />
                <span>{t('settings.language')}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                {t('settings.languageDesc')}
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-start rounded-lg border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-neutral-900 sm:self-auto">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition ${language === 'en'
                  ? 'bg-[#0b7e74] text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
              >
                <span>EN</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('my')}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs font-bold transition ${language === 'my'
                  ? 'bg-[#0b7e74] text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                  }`}
              >
                <span>မြန်</span>
              </button>
            </div>
          </div>

          {/* THEME SWITCHER */}
          <div className="flex flex-col gap-3 rounded-lg border border-black/5 bg-neutral-50 p-4 dark:border-white/5 dark:bg-neutral-950/60 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold">{t('settings.appearanceTheme')}</p>
              <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                {t('settings.themeDesc')}
              </p>
            </div>

            <div className="flex items-center gap-1.5 self-start rounded-lg border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-neutral-900 sm:self-auto">
              <button
                type="button"
                onClick={() => isDarkMode && toggleDarkMode()}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${!isDarkMode ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-500 hover:text-white'
                  }`}
              >
                <Sun className="h-3.5 w-3.5" />
                <span>{t('settings.light')}</span>
              </button>
              <button
                type="button"
                onClick={() => !isDarkMode && toggleDarkMode()}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition ${isDarkMode ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
              >
                <Moon className="h-3.5 w-3.5" />
                <span>{t('settings.dark')}</span>
              </button>
            </div>
          </div>

          {/* NOTIFICATION PREFERENCES */}
          <div className="space-y-3 rounded-lg border border-black/5 bg-neutral-50 p-4 dark:border-white/5 dark:bg-neutral-950/60">
            <p className="text-xs font-bold">{t('settings.notificationsTitle')}</p>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              <label className="flex cursor-pointer items-center justify-between py-2.5">
                <span className="text-xs font-medium">{t('settings.emailAlerts')}</span>
                <input
                  type="checkbox"
                  checked={preferences.emailAlerts}
                  onChange={() => togglePref('emailAlerts')}
                  className="size-4 rounded accent-[#0b7e74]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between py-2.5">
                <span className="text-xs font-medium">{t('settings.inAppAlerts')}</span>
                <input
                  type="checkbox"
                  checked={preferences.inAppAlerts}
                  onChange={() => togglePref('inAppAlerts')}
                  className="size-4 rounded accent-[#0b7e74]"
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between py-2.5">
                <span className="text-xs font-medium">{t('settings.autoCopyNumbers')}</span>
                <input
                  type="checkbox"
                  checked={preferences.autoCopyNumber}
                  onChange={() => togglePref('autoCopyNumber')}
                  className="size-4 rounded accent-[#0b7e74]"
                />
              </label>
            </div>
          </div>

          {/* CONTACT METHODS FOR DELIVERY NOTIFICATIONS */}
          <ContactMethodsEditor
            initialMethods={profile?.contactMethods || []}
            onSave={handleSaveContactMethods}
            isSaving={isSavingContacts}
          />

          {/* ACCOUNT SESSION & SIGN OUT */}
          <div className="flex flex-col gap-3 rounded-lg border border-rose-500/15 bg-rose-500/5 p-4 dark:border-rose-500/20 dark:bg-rose-950/20 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold text-neutral-900 dark:text-white">{t('settings.accountSession')}</p>
              <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                {t('settings.signedInAs')}{' '}
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{user?.email}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 active:scale-[0.99]"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{t('settings.signOut')}</span>
            </button>
          </div>
        </div>

        {/* NOTIFICATIONS FEED & QUICK NAV SIDEBAR */}
        <div className="space-y-5">
          {/* QUICK LINKS */}
          <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              {t('settings.quickNav')}
            </h2>
            <div className="space-y-1.5 text-xs font-bold">
              <Link
                to="/account?tab=orders"
                className="flex items-center justify-between rounded-lg p-2.5 text-neutral-700 hover:bg-neutral-100 hover:text-black dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white transition"
              >
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#0b7e74]" />
                  <span>{t('account.ordersTab')}</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
              </Link>
              <Link
                to="/account?tab=warranty"
                className="flex items-center justify-between rounded-lg p-2.5 text-neutral-700 hover:bg-neutral-100 hover:text-black dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white transition"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('account.warrantyTab')}</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
              </Link>
              <Link
                to="/subscriptions"
                className="flex items-center justify-between rounded-lg p-2.5 text-neutral-700 hover:bg-neutral-100 hover:text-black dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white transition"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <span>{t('account.subscriptionsTab')}</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
              </Link>
              <Link
                to="/wallet"
                className="flex items-center justify-between rounded-lg p-2.5 text-neutral-700 hover:bg-neutral-100 hover:text-black dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white transition"
              >
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[#0b7e74]" />
                  <span>{t('common.wallet')}</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
              </Link>
            </div>
          </div>

          {/* NOTIFICATIONS FEED */}
          <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/5">
              <div>
                <h2 className="text-sm font-black">{t('settings.notificationsFeed')}</h2>
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {notifications.length} {t('settings.alertsCount')}
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
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-600 hover:text-white dark:text-rose-400"
                >
                  <Trash2 className="h-3 w-3" />
                  {t('settings.clearAll')}
                </button>
              )}
            </div>

            <div className="mt-3.5 space-y-2.5 max-h-[380px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs font-medium text-neutral-400">
                  {t('settings.noAlerts')}
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="group relative flex items-start justify-between gap-2 rounded-lg border border-black/5 bg-neutral-50 p-3 transition hover:bg-neutral-100 dark:border-white/5 dark:bg-neutral-950/60 dark:hover:bg-neutral-950"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#0b7e74]">{notification.title}</p>
                      <p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-300">
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
                      title={t('settings.deleteNotification')}
                      className="shrink-0 rounded-md p-1 text-neutral-400 opacity-80 transition hover:bg-rose-500/10 hover:text-rose-500 group-hover:opacity-100 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
