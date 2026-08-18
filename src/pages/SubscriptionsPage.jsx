import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Sparkles,
  Check,
  X,
  CreditCard,
  ShieldCheck,
  Moon,
  Crown,
  Zap,
  ArrowRight,
  RotateCw,
  Clock,
  ChevronRight,
  Gift,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../utils/useAuth'
import { useTranslation } from '../utils/useTranslation'
import { formatCurrency } from '../utils/format'
import {
  SUBSCRIPTION_PLANS,
  getUserSubscription,
} from '../utils/subscriptionPlans'
import {
  subscribeToPlanWithWallet,
  toggleSubscriptionAutoRenew,
  cancelSubscriptionPlan,
} from '../services/storeService'

export function SubscriptionsPage() {
  const { profile, user, refreshProfile } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' | 'yearly'
  const [subscribingTier, setSubscribingTier] = useState(null)
  const [isUpdatingAutoRenew, setIsUpdatingAutoRenew] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', message: string }

  const subData = useMemo(() => getUserSubscription(profile), [profile])
  const walletBalance = profile?.walletBalance ?? 0

  async function handleSubscribe(planId) {
    if (!user) {
      navigate('/account')
      return
    }

    const plan = SUBSCRIPTION_PLANS[planId]
    if (!plan || planId === 'free') return

    const price = billingCycle === 'yearly' ? plan.priceYearlyMmk : plan.priceMonthlyMmk
    if (walletBalance < price) {
      setFeedback({
        type: 'error',
        message: `${t('subscriptions.insufficientWallet')} (${formatCurrency(price)})`,
      })
      return
    }

    setSubscribingTier(planId)
    setFeedback(null)

    try {
      const result = await subscribeToPlanWithWallet({
        planId,
        billingCycle,
        user,
      })

      if (refreshProfile) await refreshProfile()

      setFeedback({
        type: 'success',
        message: `Successfully subscribed to ${plan.name}!`,
      })
    } catch (err) {
      console.error('Subscription purchase failed:', err)
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to activate subscription. Please try again.',
      })
    } finally {
      setSubscribingTier(null)
    }
  }

  async function handleToggleAutoRenew(enabled) {
    if (!user) return
    setIsUpdatingAutoRenew(true)
    try {
      if (enabled) {
        await toggleSubscriptionAutoRenew({ user, enabled: true })
      } else {
        await cancelSubscriptionPlan({ user })
      }
      if (refreshProfile) await refreshProfile()
      setFeedback({
        type: 'success',
        message: enabled ? t('subscriptions.autoRenewOn') : t('subscriptions.autoRenewOff'),
      })
    } catch (err) {
      setFeedback({
        type: 'error',
        message: `Failed to update auto-renewal: ${err.message}`,
      })
    } finally {
      setIsUpdatingAutoRenew(false)
    }
  }

  const plansList = [
    SUBSCRIPTION_PLANS.free,
    SUBSCRIPTION_PLANS.lunar,
    SUBSCRIPTION_PLANS.lunar_plus,
    SUBSCRIPTION_PLANS.stellar,
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* HERO SECTION */}
      <div className="relative overflow-hidden rounded-xl bg-neutral-950 p-6 text-white shadow-xl dark:bg-neutral-900 sm:p-10 text-center">
        {/* Glow Ambient Blobs */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-tr from-[#0b7e74]/40 via-purple-600/30 to-amber-500/30 blur-3xl opacity-70" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-3.5">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            {t('subscriptions.title')}
          </h1>

          <p className="text-xs sm:text-sm text-neutral-300 font-medium max-w-2xl mx-auto">
            {t('subscriptions.subtitle')}
          </p>

          {/* BILLING CYCLE SELECTOR */}
          <div className="pt-2 flex items-center justify-center">
            <div className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 p-1 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`cursor-pointer rounded-md px-4 py-1.5 text-xs font-bold transition ${billingCycle === 'monthly'
                    ? 'bg-white text-neutral-950 shadow-sm'
                    : 'text-neutral-300 hover:text-white'
                  }`}
              >
                {t('subscriptions.monthly')}
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`cursor-pointer rounded-md px-4 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${billingCycle === 'yearly'
                    ? 'bg-[#67dccf] text-neutral-950 shadow-sm'
                    : 'text-neutral-300 hover:text-white'
                  }`}
              >
                <span>{t('subscriptions.yearly')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`rounded-lg p-3 text-xs font-bold flex items-center justify-between border ${feedback.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs uppercase font-bold hover:opacity-80 cursor-pointer ml-4"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {/* CURRENT ACTIVE SUBSCRIPTION DASHBOARD (IF LOGGED IN & ACTIVE) */}
      {user && subData.tier !== 'free' && subData.isActive && (
        <div className="rounded-xl border border-[#0b7e74]/20 bg-[#0b7e74]/5 p-5 shadow-sm dark:bg-[#0b7e74]/10 sm:p-6 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 pb-3.5 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#0b7e74] text-white shadow-sm">
                {subData.tier === 'stellar' ? (
                  <Crown className="h-5 w-5" />
                ) : subData.tier === 'lunar_plus' ? (
                  <Sparkles className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2
                    className={`text-lg font-black ${subData.tier === 'stellar'
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent'
                        : subData.tier === 'lunar_plus'
                          ? 'text-purple-600 dark:text-purple-400'
                          : subData.tier === 'lunar'
                            ? 'text-[#0b7e74] dark:text-[#67dccf]'
                            : 'text-neutral-900 dark:text-white'
                      }`}
                  >
                    {t(`subscriptions.plans.${subData.tier}.name`, subData.plan.name)}
                  </h2>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    {t('subscriptions.activeMember')}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('subscriptions.renewsOn')}: {subData.expiresAt ? new Date(subData.expiresAt).toLocaleDateString() : 'N/A'} ({t('subscriptions.daysRemaining', { days: subData.daysRemaining })})
                </p>
              </div>
            </div>

            {/* Auto-renew Toggle */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                {t('subscriptions.autoRenew')}:
              </span>
              <button
                type="button"
                disabled={isUpdatingAutoRenew}
                onClick={() => handleToggleAutoRenew(!subData.autoRenew)}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${subData.autoRenew
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}
              >
                {subData.autoRenew ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{t('subscriptions.autoRenewOn')}</span>
                  </>
                ) : (
                  <>
                    <X className="h-3.5 w-3.5" />
                    <span>{t('subscriptions.autoRenewOff')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1">
            <div className="rounded-lg bg-white p-2.5 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
              <span className="text-[10px] uppercase font-bold text-neutral-400">{t('subscriptions.walletLimit')}</span>
              <p className="text-xs sm:text-sm font-black mt-0.5 text-[#0b7e74] dark:text-[#67dccf]">
                {formatCurrency(subData.plan.walletLimitMmk)}
              </p>
            </div>
            <div className="rounded-lg bg-white p-2.5 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
              <span className="text-[10px] uppercase font-bold text-neutral-400">{t('subscriptions.customOrdersLimit')}</span>
              <p className="text-xs sm:text-sm font-black mt-0.5 text-[#0b7e74] dark:text-[#67dccf]">
                {subData.plan.customOrderLimitPerDay === Infinity ? t('subscriptions.unlimited') : `${subData.plan.customOrderLimitPerDay} ${t('subscriptions.perDay')}`}
              </p>
            </div>
            <div className="rounded-lg bg-white p-2.5 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
              <span className="text-[10px] uppercase font-bold text-neutral-400">{t('subscriptions.memberDiscount')}</span>
              <p className="text-xs sm:text-sm font-black mt-0.5 text-[#0b7e74] dark:text-[#67dccf]">
                {subData.plan.memberDiscountPercent}% {t('subscriptions.off')}
              </p>
            </div>
            <div className="rounded-lg bg-white p-2.5 dark:bg-neutral-900 border border-black/5 dark:border-white/5">
              <span className="text-[10px] uppercase font-bold text-neutral-400">{t('subscriptions.renewsOn')}</span>
              <p className="text-xs sm:text-sm font-black mt-0.5 text-neutral-900 dark:text-white">
                {subData.expiresAt ? new Date(subData.expiresAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4-PLAN CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {plansList.map((plan) => {
          const isCurrentPlan = subData.tier === plan.tier && (plan.tier === 'free' || subData.isActive)
          const price = billingCycle === 'yearly' ? plan.priceYearlyMmk : plan.priceMonthlyMmk
          const hasSufficientWallet = walletBalance >= price

          const planName = t(`subscriptions.plans.${plan.tier}.name`, plan.name)
          const planDesc = t(`subscriptions.plans.${plan.tier}.desc`, plan.description)

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-xl border p-5 sm:p-6 transition-all duration-200 ${plan.highlight
                  ? 'border-purple-500/50 bg-gradient-to-b from-purple-500/5 via-white to-white shadow-md dark:via-neutral-900 dark:to-neutral-900 dark:border-purple-500/40 ring-1 ring-purple-500/20'
                  : plan.tier === 'stellar'
                    ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/5 via-white to-white shadow-md dark:via-neutral-900 dark:to-neutral-900 dark:border-amber-500/40'
                    : 'border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900'
                }`}
            >
              {/* Popular / Recommended Tag */}
              {plan.highlight && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  {t('subscriptions.popular')}
                </div>
              )}

              {plan.tier === 'stellar' && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-md bg-gradient-to-r from-amber-500 to-yellow-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-950 shadow-sm">
                  {t('subscriptions.vipUltimate')}
                </div>
              )}

              {/* CARD TOP CONTENT */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {plan.tier === 'stellar' ? (
                      <Crown className="h-5 w-5 text-amber-500" />
                    ) : plan.tier === 'lunar_plus' ? (
                      <Sparkles className="h-5 w-5 text-purple-500" />
                    ) : plan.tier === 'lunar' ? (
                      <Moon className="h-5 w-5 text-[#0b7e74] dark:text-[#67dccf]" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-neutral-400" />
                    )}
                  </div>
                  {isCurrentPlan && (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                      {t('subscriptions.currentTier')}
                    </span>
                  )}
                </div>

                <div>
                  <h3
                    className={`text-lg font-black ${plan.tier === 'stellar'
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent'
                        : plan.tier === 'lunar_plus'
                          ? 'text-purple-600 dark:text-purple-400'
                          : plan.tier === 'lunar'
                            ? 'text-[#0b7e74] dark:text-[#67dccf]'
                            : 'text-neutral-900 dark:text-white'
                      }`}
                  >
                    {planName}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 min-h-[30px]">
                    {planDesc}
                  </p>
                </div>

                {/* PRICING */}
                <div className="pt-2 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white">
                      {plan.priceMonthlyMmk === 0
                        ? t('subscriptions.free')
                        : formatCurrency(price)}
                    </span>
                    {plan.priceMonthlyMmk > 0 && (
                      <span className="text-xs font-semibold text-neutral-400">
                        {billingCycle === 'yearly' ? t('subscriptions.perYear') : t('subscriptions.perMonth')}
                      </span>
                    )}
                  </div>
                  {plan.priceMonthlyMmk > 0 && billingCycle === 'yearly' && (
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {t('subscriptions.equalsPerMonth', { amount: formatCurrency(Math.round(plan.priceYearlyMmk / 12)) })}
                    </p>
                  )}
                </div>

                {/* PERKS LIST */}
                <div className="pt-2 space-y-2 text-xs">
                  {plan.perks.map((perk, idx) => {
                    const perkText = t(`subscriptions.plans.${plan.tier}.perk${idx + 1}`, perk.text)
                    return (
                      <div key={idx} className="flex items-start gap-2">
                        {perk.included ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-[#0b7e74] dark:text-[#67dccf] mt-0.5" />
                        ) : (
                          <X className="h-3.5 w-3.5 shrink-0 text-neutral-300 dark:text-neutral-600 mt-0.5" />
                        )}
                        <span
                          className={
                            perk.included
                              ? 'font-medium text-neutral-800 dark:text-neutral-200'
                              : 'text-neutral-400 dark:text-neutral-500 line-through'
                          }
                        >
                          {perkText}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-4 border-t border-black/5 dark:border-white/5 mt-4">
                {plan.tier === 'free' ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-lg border border-black/10 bg-neutral-100 py-2.5 text-xs font-bold text-neutral-500 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-400"
                  >
                    {isCurrentPlan ? t('subscriptions.defaultPlan') : t('subscriptions.freeTier')}
                  </button>
                ) : isCurrentPlan ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-lg bg-emerald-600/10 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 cursor-default"
                  >
                    {t('subscriptions.activeMember')}
                  </button>
                ) : !user ? (
                  <Link
                    to="/account"
                    className="w-full inline-flex items-center justify-center rounded-lg bg-[#0b7e74] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#096860]"
                  >
                    {t('nav.login')}
                  </Link>
                ) : hasSufficientWallet ? (
                  <button
                    type="button"
                    disabled={subscribingTier === plan.tier}
                    onClick={() => handleSubscribe(plan.tier)}
                    className={`cursor-pointer w-full inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold text-white shadow-sm transition ${plan.tier === 'stellar'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-neutral-950 hover:brightness-105'
                        : plan.tier === 'lunar_plus'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-105'
                          : 'bg-[#0b7e74] hover:bg-[#096860]'
                      } disabled:opacity-50`}
                  >
                    {subscribingTier === plan.tier ? (
                      <>
                        <RotateCw className="h-3.5 w-3.5 animate-spin" />
                        <span>{t('common.loading')}</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>{t('subscriptions.subscribeWithWallet')}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-lg bg-neutral-200 py-2 text-xs font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                    >
                      {t('checkout.insufficientBalance')}
                    </button>
                    <Link
                      to="/payment?purpose=wallet_topup"
                      className="inline-flex w-full items-center justify-center gap-1 text-xs font-bold text-[#0b7e74] hover:underline"
                    >
                      <span>{t('subscriptions.topupShort', { amount: formatCurrency(price - walletBalance) })}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}

