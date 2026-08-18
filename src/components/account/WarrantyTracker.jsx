import { useState, useMemo } from 'react'
import { Link } from 'react-router'
import {
  ShieldCheck,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LifeBuoy,
  X,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { useTranslation } from '../../utils/useTranslation'
import { calculateItemWarranty } from '../../utils/warrantyUtils'
import { getUserSubscription } from '../../utils/subscriptionPlans'

export function WarrantyTracker({ orders = [], profile }) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'expiring_soon' | 'expired'
  const [claimTarget, setClaimTarget] = useState(null)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [claimNote, setClaimNote] = useState('')

  const subData = useMemo(() => getUserSubscription(profile), [profile])

  // Extract all delivered / fulfilled items from customer orders
  const warrantyItems = useMemo(() => {
    const list = []

    orders.forEach((order) => {
      // Include delivered or paid orders
      const items = Array.isArray(order.items) ? order.items : []
      const orderDate = order.deliveredAt || order.createdAt
      const orderStatus = order.status

      // Only track fulfilled, delivered, or processing/paid orders
      if (['rejected', 'cancelled', 'deleted'].includes(orderStatus)) return

      items.forEach((item, itemIdx) => {
        const warranty = calculateItemWarranty({
          item,
          orderDeliveredAt: order.deliveredAt,
          orderCreatedAt: order.createdAt,
          userTier: subData.tier,
        })

        if (warranty && warranty.hasWarranty) {
          list.push({
            id: `${order.id}-${itemIdx}`,
            orderId: order.id,
            orderDate,
            orderStatus,
            item,
            warranty,
          })
        }
      })
    })

    // Sort by remaining days ascending (active/expiring soon first, expired last)
    return list.sort((a, b) => {
      if (a.warranty.status === 'expired' && b.warranty.status !== 'expired') return 1
      if (a.warranty.status !== 'expired' && b.warranty.status === 'expired') return -1
      return a.warranty.daysRemaining - b.warranty.daysRemaining
    })
  }, [orders, subData.tier])

  // Filtered items
  const filteredItems = useMemo(() => {
    return warrantyItems.filter((entry) => {
      const matchesSearch =
        entry.item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.item.variantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.orderId.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (statusFilter === 'active') {
        return entry.warranty.status === 'active' || entry.warranty.status === 'expiring_soon'
      }
      if (statusFilter === 'expiring_soon') {
        return entry.warranty.status === 'expiring_soon'
      }
      if (statusFilter === 'expired') {
        return entry.warranty.status === 'expired'
      }
      return true
    })
  }, [warrantyItems, searchQuery, statusFilter])

  const stats = useMemo(() => {
    let active = 0
    let expiringSoon = 0
    let expired = 0

    warrantyItems.forEach((entry) => {
      if (entry.warranty.status === 'active') active++
      else if (entry.warranty.status === 'expiring_soon') {
        active++
        expiringSoon++
      } else if (entry.warranty.status === 'expired') expired++
    })

    return { total: warrantyItems.length, active, expiringSoon, expired }
  }, [warrantyItems])

  function handleOpenClaim(entry) {
    setClaimTarget(entry)
    setClaimSuccess(false)
    setClaimNote('')
  }

  function handleSubmitClaim(e) {
    e.preventDefault()
    setClaimSuccess(true)
  }

  return (
    <div className="space-y-5">
      {/* SUMMARY BANNER */}
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-[#0b7e74]/5 to-transparent p-3.5 sm:p-5 dark:border-emerald-500/10 dark:from-emerald-950/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm sm:text-base font-black text-neutral-900 dark:text-white">
                {t('warranty.title')}
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-600 dark:text-neutral-400 max-w-xl">
              {t('warranty.subtitle')}
            </p>
          </div>

          {/* VIP PERK CHIP */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {subData.plan.extendedWarrantyMonths > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>{t('warranty.vipPerkBadge', { months: subData.plan.extendedWarrantyMonths, tier: subData.plan.name })}</span>
              </span>
            ) : (
              <Link
                to="/subscriptions"
                className="inline-flex items-center gap-1 rounded-md border border-[#0b7e74]/30 bg-[#0b7e74]/10 px-2.5 py-1 text-xs font-semibold text-[#0b7e74] hover:bg-[#0b7e74] hover:text-white transition dark:text-[#67dccf]"
              >
                <span>{t('warranty.upgradeForBonus')}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        {/* QUICK METRICS (COMPACT RIBBON) */}
        <div className="mt-3 rounded-lg border border-black/5 bg-white/70 p-2 sm:p-2.5 dark:border-white/5 dark:bg-neutral-900/70">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:divide-x divide-black/5 dark:divide-white/5">
            <div className="px-1.5 sm:px-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t('warranty.totalTracked')}</p>
              <p className="mt-0.5 text-sm sm:text-base font-black text-neutral-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="px-1.5 sm:px-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{t('warranty.active')}</p>
              <p className="mt-0.5 text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">{stats.active}</p>
            </div>
            <div className="px-1.5 sm:px-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">{t('warranty.expiringSoon')}</p>
              <p className="mt-0.5 text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">{stats.expiringSoon}</p>
            </div>
            <div className="px-1.5 sm:px-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t('warranty.expired')}</p>
              <p className="mt-0.5 text-sm sm:text-base font-black text-neutral-500">{stats.expired}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTROLS BAR: SEARCH & STATUS FILTER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('warranty.searchPlaceholder')}
            className="w-full rounded-lg border border-black/10 bg-white py-2 pl-9 pr-4 text-xs font-semibold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
          />
        </div>

        {/* STATUS FILTER PILLS */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: t('warranty.allStatuses') },
            { id: 'active', label: t('warranty.active') },
            { id: 'expiring_soon', label: t('warranty.expiringSoon') },
            { id: 'expired', label: t('warranty.expired') },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ITEMS LIST */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-black/5 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <ShieldCheck className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-700" />
          <h4 className="mt-3 text-sm sm:text-base font-bold text-neutral-800 dark:text-neutral-200">
            {t('warranty.noItemsTitle')}
          </h4>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? t('warranty.adjustFiltersDesc')
              : t('warranty.noItemsDesc')}
          </p>
          <Link
            to="/store"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0b7e74] px-4 py-2 text-xs font-bold text-white hover:bg-[#096860] transition"
          >
            <span>{t('warranty.exploreProducts')}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredItems.map((entry) => {
            const { item, warranty, orderId } = entry
            const isExpired = warranty.status === 'expired'
            const isExpiring = warranty.status === 'expiring_soon'

            return (
              <div
                key={entry.id}
                className={`flex flex-col justify-between rounded-xl border p-3 sm:p-4 transition-all shadow-sm ${
                  isExpired
                    ? 'border-black/5 bg-neutral-50 dark:border-white/5 dark:bg-neutral-900/50 opacity-75'
                    : isExpiring
                    ? 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20'
                    : 'border-emerald-500/20 bg-white dark:border-emerald-500/10 dark:bg-neutral-900'
                }`}
              >
                <div>
                  {/* TOP ROW: TITLE & STATUS BADGE */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {item.name}
                      </h4>
                      {item.variantName && (
                        <p className="text-[11px] font-semibold text-[#0b7e74] dark:text-[#67dccf] mt-0.5">
                          {item.variantName}
                        </p>
                      )}
                      <Link
                        to={`/orders/${orderId}`}
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-neutral-400 hover:text-[#0b7e74] transition mt-0.5"
                      >
                        <span>{t('warranty.orderNumber', { id: orderId.slice(0, 8) })}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </Link>
                    </div>

                    {/* STATUS PILL */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        isExpired
                          ? 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                          : isExpiring
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                      }`}
                    >
                      <ShieldCheck className="h-3 w-3" />
                      <span>{warranty.statusLabel}</span>
                    </span>
                  </div>

                  {/* DURATION BREAKDOWN */}
                  <div className="mt-3.5 rounded-lg bg-black/5 p-2.5 dark:bg-white/5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-neutral-500">{t('warranty.coverageDuration')}</span>
                      <span className="text-neutral-900 dark:text-white font-mono">
                        {t('warranty.months', { months: warranty.totalMonths })}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
                      <span>{t('warranty.baseBonus', { base: warranty.baseMonths, bonus: warranty.memberBonusMonths > 0 ? t('warranty.vipBonusTag', { bonus: warranty.memberBonusMonths }) : '' })}</span>
                      <span>{isExpired ? t('warranty.coverageEnded') : t('warranty.daysRemaining', { days: warranty.daysRemaining })}</span>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isExpired
                            ? 'bg-neutral-400'
                            : isExpiring
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${warranty.percentElapsed}%` }}
                      />
                    </div>
                  </div>

                  {/* TIMESTAMPS */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px] text-neutral-500">
                    <div>
                      <span className="block font-semibold uppercase tracking-wider text-neutral-400">{t('warranty.startDate')}</span>
                      <span className="font-mono text-neutral-700 dark:text-neutral-300">
                        {warranty.startDate ? new Date(warranty.startDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="block font-semibold uppercase tracking-wider text-neutral-400">{t('warranty.expiresOn')}</span>
                      <span className="font-mono text-neutral-700 dark:text-neutral-300">
                        {warranty.expiresAt ? new Date(warranty.expiresAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BOTTOM ACTION */}
                <div className="mt-3.5 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-neutral-400">
                    {isExpired ? t('warranty.coverageEnded') : t('warranty.supportNotice')}
                  </span>

                  {!isExpired ? (
                    <button
                      type="button"
                      onClick={() => handleOpenClaim(entry)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0b7e74] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#096860] transition shadow-sm"
                    >
                      <LifeBuoy className="h-3.5 w-3.5" />
                      <span>{t('warranty.claimService')}</span>
                    </button>
                  ) : (
                    <Link
                      to={`/product/${item.slug || ''}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b7e74] hover:underline"
                    >
                      <span>{t('warranty.renewItem')}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CLAIM / SERVICE INQUIRY MODAL */}
      {claimTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-black/10 pb-3.5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base font-black text-neutral-900 dark:text-white">
                  {t('warranty.requestTitle')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setClaimTarget(null)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {claimSuccess ? (
              <div className="py-5 text-center space-y-3.5">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h4 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {t('warranty.requestReceived')}
                </h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  {t('warranty.requestReceivedDesc', { name: claimTarget.item.name })}
                </p>
                <button
                  type="button"
                  onClick={() => setClaimTarget(null)}
                  className="rounded-lg bg-[#0b7e74] px-5 py-2 text-xs font-bold text-white hover:bg-[#096860] transition cursor-pointer"
                >
                  {t('warranty.done')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitClaim} className="mt-4 space-y-3.5">
                <div className="rounded-lg bg-neutral-50 p-3 text-xs dark:bg-neutral-800 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">{t('warranty.product')}:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{claimTarget.item.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">{t('warranty.orderId')}:</span>
                    <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">#{claimTarget.orderId.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">{t('warranty.status')}:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {t('warranty.activeStatusLabel', { days: claimTarget.warranty.daysRemaining })}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {t('warranty.describeIssue')}
                  </label>
                  <textarea
                    rows={3}
                    value={claimNote}
                    onChange={(e) => setClaimNote(e.target.value)}
                    placeholder={t('warranty.describePlaceholder')}
                    className="w-full rounded-lg border border-black/10 p-2.5 text-xs font-medium outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setClaimTarget(null)}
                    className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    {t('warranty.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-[#0b7e74] px-5 py-2 text-xs font-bold text-white hover:bg-[#096860] transition cursor-pointer"
                  >
                    {t('warranty.submitTicket')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
