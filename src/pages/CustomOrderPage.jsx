import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  Sparkles,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Wallet,
  Send,
  HelpCircle,
  ExternalLink,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RotateCcw,
  Copy,
  Check,
  ArrowRight,
  Package,
  Tag,
} from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../utils/useAuth'
import { useTranslation } from '../utils/useTranslation'
import {
  createCustomOrder,
  getDailyCustomOrderCount,
} from '../services/storeService'
import { getUserSubscription } from '../utils/subscriptionPlans'
import { AnimatedSelect } from '../components/common/AnimatedSelect'
import { ContactMethodsEditor } from '../components/account/ContactMethodsEditor'

const ORDER_TYPE_OPTIONS = [
  { value: 'Key', label: 'Digital Key / License Code' },
  { value: 'Account', label: 'Account (Pre-created / Upgrade)' },
  { value: 'Activation Link', label: 'Activation / Invite Link' },
  { value: 'Direct Top-up', label: 'Direct In-App / Game Top-up' },
  { value: 'Other', label: 'Other / Custom Service' },
]

const REGION_OPTIONS = [
  { value: 'Global', label: 'Global / Worldwide' },
  { value: 'Myanmar', label: 'Myanmar (MM)' },
  { value: 'United States', label: 'United States (US)' },
  { value: 'Asia', label: 'Asia / SEA' },
  { value: 'Europe', label: 'Europe (EU)' },
  { value: 'Turkey', label: 'Turkey (TR)' },
  { value: 'Argentina', label: 'Argentina (AR)' },
  { value: 'Brazil', label: 'Brazil (BR)' },
  { value: 'India', label: 'India (IN)' },
  { value: 'Other', label: 'Other / Any' },
]

export function CustomOrderPage() {
  const { user, profile, updateProfile } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const subData = useMemo(() => getUserSubscription(profile), [profile])

  // Form states
  const [productName, setProductName] = useState(searchParams.get('product') || '')
  const [providerName, setProviderName] = useState(searchParams.get('provider') || '')
  const [orderType, setOrderType] = useState('Key')
  const [targetRegion, setTargetRegion] = useState('Global')
  const [productUrl, setProductUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [accountLogin, setAccountLogin] = useState('')
  const [accountPassword, setAccountPassword] = useState('')
  const [gameUid, setGameUid] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Account Contact methods state
  const [contactMethods, setContactMethods] = useState(() => {
    if (Array.isArray(profile?.contactMethods) && profile.contactMethods.length > 0) {
      return profile.contactMethods
    }
    return [{ priority: 1, type: 'Email', value: profile?.email || '' }]
  })

  useEffect(() => {
    if (Array.isArray(profile?.contactMethods) && profile.contactMethods.length > 0) {
      setContactMethods(profile.contactMethods)
    } else if (profile?.email) {
      setContactMethods([{ priority: 1, type: 'Email', value: profile.email }])
    }
  }, [profile?.contactMethods, profile?.email])

  const validContacts = useMemo(() => {
    return Array.isArray(contactMethods)
      ? contactMethods.filter((cm) => cm.type && cm.value && cm.value.trim() !== '')
      : []
  }, [contactMethods])

  const isContactValid = validContacts.length > 0

  const [submitting, setSubmitting] = useState(false)
  const [formFeedback, setFormFeedback] = useState(null)
  const [dailyOrderCount, setDailyOrderCount] = useState(0)

  // Refresh daily quota
  async function refreshDailyCount() {
    if (!user) return
    try {
      const count = await getDailyCustomOrderCount(user.id)
      setDailyOrderCount(count)
    } catch (e) {
      console.error('Error fetching daily count:', e)
    }
  }

  useEffect(() => {
    refreshDailyCount()
  }, [user])

  const maxDailyLimit = subData.plan.customOrderLimitPerDay ?? 3
  const isUnlimited = maxDailyLimit === -1 || maxDailyLimit >= 999
  const remainingDaily = isUnlimited ? Infinity : Math.max(0, maxDailyLimit - dailyOrderCount)

  // Handle Form Submit
  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) {
      navigate('/login')
      return
    }

    if (!isUnlimited && remainingDaily <= 0) {
      setFormFeedback({
        type: 'error',
        message: t('customOrder.quotaExceeded', { max: maxDailyLimit }),
      })
      return
    }

    if (!productName.trim()) {
      setFormFeedback({ type: 'error', message: t('customOrder.errorProductName') })
      return
    }

    if (!providerName.trim()) {
      setFormFeedback({ type: 'error', message: t('customOrder.errorProviderName') })
      return
    }

    if (!isContactValid) {
      setFormFeedback({
        type: 'error',
        message: t('checkout.contactRequired') || 'Please set up at least one contact method before submitting.',
      })
      return
    }

    setSubmitting(true)
    setFormFeedback(null)

    try {
      await createCustomOrder({
        user,
        profile,
        productName: productName.trim(),
        providerName: providerName.trim(),
        orderType,
        targetRegion,
        productUrl: productUrl.trim() || null,
        notes: notes.trim() || null,
        accountInfo: {
          login: accountLogin.trim() || null,
          password: accountPassword.trim() || null,
          gameUid: gameUid.trim() || null,
        },
        contactMethods: validContacts,
      })

      // Reset fields
      setProductName('')
      setProviderName('')
      setOrderType('Key')
      setProductUrl('')
      setNotes('')
      setAccountLogin('')
      setAccountPassword('')
      setGameUid('')
      setFormFeedback({
        type: 'success',
        message: t('customOrder.successMessage'),
      })

      await refreshDailyCount()
    } catch (err) {
      setFormFeedback({ type: 'error', message: err.message || t('common.error') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-5">
      {/* QUICK BANNER: LINK TO ORDERS & REQUESTS HUB */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-black/5 bg-white p-3.5 shadow-sm dark:border-white/5 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#0b7e74]/10 p-2 text-[#0b7e74] dark:text-[#67dccf]">
            <Package className="h-4.5 w-4.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-900 dark:text-white">
              {t('customOrder.trackExistingOrders')}
            </p>
            <p className="text-[11px] text-neutral-500">
              {t('customOrder.trackExistingDesc')}
            </p>
          </div>
        </div>
        <Link
          to="/account?tab=orders"
          className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 px-3.5 py-1.5 text-xs font-bold text-neutral-900 dark:text-white transition shrink-0"
        >
          <span>{t('customOrder.viewMyOrders')}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* HERO & EXPLANATION HEADER */}
      <div className="rounded-xl border border-black/10 bg-gradient-to-br from-[#0b7e74]/15 via-white to-transparent p-5 sm:p-8 shadow-sm dark:border-white/10 dark:from-[#0b7e74]/20 dark:via-neutral-900 dark:to-neutral-950">
        <div className="max-w-3xl space-y-2.5">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-[#0b7e74]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#0b7e74] dark:text-[#67dccf]">
            <Sparkles className="h-3.5 w-3.5" /> {t('customOrder.badge')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white leading-tight">
            {t('customOrder.heroTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {t('customOrder.heroDesc')}
          </p>
        </div>

        {/* 4-STEP PIPELINE GUIDE (COMPACT & RESPONSIVE) */}
        <div className="mt-5 rounded-lg border border-black/5 bg-white/70 p-3 sm:p-4 shadow-sm dark:border-white/5 dark:bg-neutral-800/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 sm:divide-x divide-black/5 dark:divide-white/5">
            {/* Step 1 */}
            <div className="flex items-start gap-2.5 sm:px-2">
              <span className="flex size-5 sm:size-5.5 shrink-0 items-center justify-center rounded-full bg-[#0b7e74]/15 text-[10px] sm:text-[11px] font-black text-[#0b7e74] dark:bg-[#0b7e74]/25 dark:text-[#67dccf]">
                1
              </span>
              <div className="min-w-0">
                <p className="font-bold text-xs text-neutral-900 dark:text-white leading-tight">
                  {t('customOrder.step1Title')}
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5 leading-snug">
                  {t('customOrder.step1Desc')}
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-2.5 sm:px-2">
              <span className="flex size-5 sm:size-5.5 shrink-0 items-center justify-center rounded-full bg-[#0b7e74]/15 text-[10px] sm:text-[11px] font-black text-[#0b7e74] dark:bg-[#0b7e74]/25 dark:text-[#67dccf]">
                2
              </span>
              <div className="min-w-0">
                <p className="font-bold text-xs text-neutral-900 dark:text-white leading-tight">
                  {t('customOrder.step2Title')}
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5 leading-snug">
                  {t('customOrder.step2Desc')}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-2.5 sm:px-2">
              <span className="flex size-5 sm:size-5.5 shrink-0 items-center justify-center rounded-full bg-[#0b7e74]/15 text-[10px] sm:text-[11px] font-black text-[#0b7e74] dark:bg-[#0b7e74]/25 dark:text-[#67dccf]">
                3
              </span>
              <div className="min-w-0">
                <p className="font-bold text-xs text-neutral-900 dark:text-white leading-tight">
                  {t('customOrder.step3Title')}
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5 leading-snug">
                  {t('customOrder.step3Desc')}
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="flex items-start gap-2.5 sm:px-2">
              <span className="flex size-5 sm:size-5.5 shrink-0 items-center justify-center rounded-full bg-[#0b7e74]/15 text-[10px] sm:text-[11px] font-black text-[#0b7e74] dark:bg-[#0b7e74]/25 dark:text-[#67dccf]">
                4
              </span>
              <div className="min-w-0">
                <p className="font-bold text-xs text-neutral-900 dark:text-white leading-tight">
                  {t('customOrder.step4Title')}
                </p>
                <p className="text-[10px] text-neutral-500 mt-0.5 leading-snug">
                  {t('customOrder.step4Desc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOM ORDER REQUEST FORM */}
      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:p-6">
        {/* DAILY QUOTA COUNTER HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/10 pb-3.5 dark:border-white/10">
          <div>
            <h2 className="text-base sm:text-lg font-black text-black dark:text-white">{t('customOrder.createRequest')}</h2>
            <p className="text-xs text-neutral-500">
              {isUnlimited ? (
                <span>
                  {t('customOrder.unlimitedStellar')}
                </span>
              ) : (
                <span>
                  {t('customOrder.quotaDesc', { tier: subData.plan.name, max: maxDailyLimit })}
                  {' '}
                  <Link to="/subscriptions" className="font-bold text-[#0b7e74] hover:underline dark:text-[#67dccf]">
                    {t('customOrder.upgradeLimits')}
                  </Link>
                </span>
              )}
            </p>
          </div>

          <div
            className={`flex items-center gap-1.5 self-start sm:self-auto rounded-md px-2.5 py-1 text-xs font-bold ${isUnlimited || remainingDaily > 0
              ? 'bg-[#0b7e74]/15 text-[#0b7e74] dark:text-[#67dccf]'
              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>
              {isUnlimited
                ? 'Unlimited Quotes'
                : t('customOrder.leftToday', { remaining: remainingDaily, max: maxDailyLimit })}
            </span>
          </div>
        </div>

        {/* FEEDBACK NOTIFICATION */}
        {formFeedback && (
          <div
            className={`mt-4 rounded-lg p-3 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${formFeedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
              }`}
          >
            <span>{formFeedback.message}</span>
            {formFeedback.type === 'success' && (
              <Link
                to="/account?tab=orders"
                className="font-bold underline hover:opacity-80 transition shrink-0"
              >
                {t('customOrder.viewInOrders')}
              </Link>
            )}
          </div>
        )}

        {/* FORM FIELDS */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* PRODUCT NAME INPUT */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              {t('customOrder.productName')} *
            </label>
            <input
              type="text"
              required
              placeholder="Cyberpunk 2077"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
            />
          </div>

          {/* PLATFORM/PROVIDER FIELD & DELIVERY METHOD DROPDOWN */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                {t('customOrder.providerName')} *
              </label>
              <input
                type="text"
                required
                placeholder="Steam"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                {t('customOrder.orderType')}
              </label>
              <div className="mt-1">
                <AnimatedSelect
                  value={orderType}
                  onChange={setOrderType}
                  options={ORDER_TYPE_OPTIONS}
                  placeholder="Select Delivery Method"
                />
              </div>
            </div>
          </div>

          {/* IF ACCOUNT UPGRADE / DIRECT TOP-UP: SHOW CREDENTIAL INPUTS (ENCRYPTED) */}
          {(orderType === 'Account' || orderType === 'Direct Top-up') && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <Lock className="h-3.5 w-3.5" />
                <span>{t('customOrder.encryptedInfoTitle')}</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                {t('customOrder.encryptedInfoDesc')}
              </p>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    {t('customOrder.accountLogin')}
                  </label>
                  <input
                    type="text"
                    placeholder={t('customOrder.accountLoginPlaceholder')}
                    value={accountLogin}
                    onChange={(e) => setAccountLogin(e.target.value)}
                    className="mt-1 w-full rounded-md border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none dark:border-white/10 dark:bg-neutral-900"
                  />
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    {t('customOrder.accountPassword')}
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      className="w-full rounded-md border border-black/10 bg-white px-2.5 py-1.5 pr-8 text-xs font-mono text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none dark:border-white/10 dark:bg-neutral-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-2 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  {t('customOrder.gameUid')}
                </label>
                <input
                  type="text"
                  placeholder={t('customOrder.gameUidPlaceholder')}
                  value={gameUid}
                  onChange={(e) => setGameUid(e.target.value)}
                  className="mt-1 w-full rounded-md border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none dark:border-white/10 dark:bg-neutral-900"
                />
              </div>
            </div>
          )}

          {/* TARGET REGION & PRODUCT URL */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                {t('customOrder.targetRegion')}
              </label>
              <div className="mt-1">
                <AnimatedSelect
                  value={targetRegion}
                  onChange={setTargetRegion}
                  options={REGION_OPTIONS}
                  placeholder="Select Region / Country"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                {t('customOrder.productUrl')}
              </label>
              <input
                type="url"
                placeholder={t('customOrder.productUrlPlaceholder')}
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
              />
            </div>
          </div>

          {/* ADDITIONAL NOTES */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              {t('customOrder.notes')}
            </label>
            <textarea
              rows={3}
              placeholder={t('customOrder.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
            />
          </div>

          {/* CONTACT METHODS FOR QUOTE NOTIFICATIONS & DELIVERY */}
          {validContacts.length > 0 && (
            <div className="rounded-lg border border-black/10 bg-white p-3.5 sm:p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-2 dark:border-white/5">
                <div>
                  <h3 className="text-xs font-black flex items-center gap-1.5 text-neutral-900 dark:text-white">
                    <Tag className="h-3.5 w-3.5 text-[#0b7e74]" /> {t('checkout.contactInfo')}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400">
                    {t('checkout.contactInfoDesc')}
                  </p>
                </div>

                <Link
                  to="/settings"
                  className="text-[11px] font-bold text-[#0b7e74] hover:underline shrink-0"
                >
                  {t('checkout.editContacts')} →
                </Link>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 font-mono">
                {validContacts.map((cm, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-black/5 bg-neutral-50 p-2.5 dark:border-white/5 dark:bg-neutral-950/60 min-w-0"
                  >
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
                      {idx === 0 ? 'Primary' : idx === 1 ? 'Secondary' : 'Backup'}
                    </span>
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mt-0.5">
                      {cm.type}
                    </span>
                    <span className="text-xs font-black text-[#0b7e74] truncate block mt-0.5 select-all">
                      {cm.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MANDATORY CONTACT METHOD SETUP (IF NONE CONFIGURED) */}
          {!isContactValid && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3.5 sm:p-4 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                <Tag className="h-3.5 w-3.5" />
                <span>{t('checkout.contactRequired')}</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {t('checkout.contactRequiredDesc')}
              </p>
              <ContactMethodsEditor
                initialMethods={contactMethods.length > 0 ? contactMethods : [{ priority: 1, type: 'Email', value: profile?.email || '' }]}
                onSave={async (updated) => {
                  setContactMethods(updated)
                  if (profile && updateProfile) {
                    await updateProfile({ contact_methods: updated })
                  }
                }}
                title="Set Up Contact Priorities"
              />
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={submitting || remainingDaily <= 0}
            className="w-full cursor-pointer rounded-lg bg-[#0b7e74] py-3 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-[#096860] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            <span>{submitting ? t('common.loading') : t('customOrder.submitRequest')}</span>
          </button>
        </form>
      </div>
    </div>
  )
}

