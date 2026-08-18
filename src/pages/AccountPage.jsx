import { useMemo, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../utils/useAuth'
import { useTranslation } from '../utils/useTranslation'
import { formatCurrency, formatNumber } from '../utils/format'
import {
  subscribeUserCollection,
  toggleSubscriptionAutoRenew,
  cancelSubscriptionPlan,
  cancelPendingOrder,
  cancelCustomOrder,
} from '../services/storeService'
import { getLocalPendingOrders, removeLocalPendingOrder } from '../utils/localOrders'
import { WarrantyTracker } from '../components/account/WarrantyTracker'
import { DeleteConfirmModal } from '../components/common/DeleteConfirmModal'
import { SecureDeliveryCard } from '../components/delivery/SecureDeliveryCard'
import {
  Trash2,
  X,
  Sparkles,
  Crown,
  Moon,
  ShieldCheck,
  ArrowRight,
  Package,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  RotateCw,
  Check,
  AlertCircle,
  CreditCard,
  Settings,
  ChevronRight,
  Key,
  ShoppingBag,
  Wallet,
} from 'lucide-react'
import { getUserSubscription, SUBSCRIPTION_PLANS } from '../utils/subscriptionPlans'

export function AccountPage() {
  const { isAdmin, isOwner, profile, user, refreshProfile } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = searchParams.get('tab') || 'orders' // 'orders' | 'warranty' | 'subscriptions'

  function setActiveTab(tab) {
    setSearchParams({ tab })
  }

  // Data states
  const [orders, setOrders] = useState([])
  const [customOrders, setCustomOrders] = useState([])
  const [localDrafts, setLocalDrafts] = useState(() => getLocalPendingOrders())
  const [orderSearch, setOrderSearch] = useState('')
  const [orderTypeFilter, setOrderTypeFilter] = useState('all') // 'all' | 'store' | 'custom'
  const [orderStatusFilter, setOrderStatusFilter] = useState('all') // 'all' | 'pending' | 'delivered' | 'rejected'
  const [deletingOrderTarget, setDeletingOrderTarget] = useState(null)
  const [isDeletingOrder, setIsDeletingOrder] = useState(false)
  const [deliveredCustomOrderModal, setDeliveredCustomOrderModal] = useState(null)

  // Subscription management states
  const [isTogglingAutoRenew, setIsTogglingAutoRenew] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isCancellingSub, setIsCancellingSub] = useState(false)
  const [subFeedback, setSubFeedback] = useState(null)

  useEffect(
    () => (user?.id ? subscribeUserCollection('orders', user.id, setOrders) : undefined),
    [user?.id],
  )

  useEffect(
    () => (user?.id ? subscribeUserCollection('custom_orders', user.id, setCustomOrders) : undefined),
    [user?.id],
  )

  const subData = useMemo(() => getUserSubscription(profile), [profile])

  // Count Service+ covered items
  const coveredWarrantyCount = useMemo(() => {
    let count = 0
    orders.forEach((o) => {
      if (['rejected', 'cancelled', 'deleted'].includes(o.status)) return
        ; (o.items || []).forEach((it) => {
          if (it.hasServicePlus || it.has_service_plus || subData.plan.freeServicePlusMonths > 0) {
            count++
          }
        })
    })
    return count
  }, [orders, subData.plan.freeServicePlusMonths])

  // Combined orders (remote + active local drafts)
  const combinedStoreOrders = useMemo(() => {
    const remoteIds = new Set(orders.map((o) => o.id))
    const activeDrafts = localDrafts.filter((o) => !remoteIds.has(o.id))
    return [...activeDrafts, ...orders].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    )
  }, [orders, localDrafts])

  // Unified list of Store Orders and Custom Orders
  const unifiedOrdersList = useMemo(() => {
    const storeList = combinedStoreOrders.map((o) => ({
      ...o,
      _entryType: 'store',
      _createdAt: o.createdAt || 0,
    }))
    const customList = customOrders.map((co) => ({
      ...co,
      _entryType: 'custom',
      _createdAt: co.createdAt || 0,
    }))
    return [...storeList, ...customList].sort(
      (a, b) => new Date(b._createdAt) - new Date(a._createdAt),
    )
  }, [combinedStoreOrders, customOrders])

  const filteredOrders = useMemo(() => {
    return unifiedOrdersList.filter((item) => {
      // Filter by type
      if (orderTypeFilter === 'store' && item._entryType !== 'store') return false
      if (orderTypeFilter === 'custom' && item._entryType !== 'custom') return false

      const q = orderSearch.trim().toLowerCase()
      if (q) {
        if (item._entryType === 'store') {
          const matchId = item.id.toLowerCase().includes(q)
          const matchItems = item.items && item.items.some((i) => i.name?.toLowerCase().includes(q))
          if (!matchId && !matchItems) return false
        } else {
          const matchId = item.id.toLowerCase().includes(q)
          const matchProduct = item.productName?.toLowerCase().includes(q)
          const matchProvider = item.providerName?.toLowerCase().includes(q)
          if (!matchId && !matchProduct && !matchProvider) return false
        }
      }

      // Filter by status
      if (orderStatusFilter === 'pending') {
        if (item._entryType === 'store') {
          return ['pending_payment', 'submitted', 'processing', 'uploading'].includes(item.status)
        } else {
          return ['pending_quote', 'quoted', 'submitted', 'paid', 'processing'].includes(item.status)
        }
      }
      if (orderStatusFilter === 'delivered') {
        return item.status === 'delivered' || item.status === 'completed'
      }
      if (orderStatusFilter === 'rejected') {
        return ['rejected', 'declined', 'cancelled'].includes(item.status)
      }
      return true
    })
  }, [unifiedOrdersList, orderTypeFilter, orderSearch, orderStatusFilter])

  async function handleConfirmDeleteOrder() {
    if (!deletingOrderTarget) return
    const targetId = deletingOrderTarget.id
    setIsDeletingOrder(true)
    try {
      if (deletingOrderTarget._entryType === 'custom') {
        await cancelCustomOrder(targetId)
        setCustomOrders((prev) => prev.map((o) => (o.id === targetId ? { ...o, status: 'cancelled' } : o)))
      } else if (deletingOrderTarget.isLocalDraft || targetId.startsWith('draft-')) {
        removeLocalPendingOrder(targetId)
        setLocalDrafts(getLocalPendingOrders())
      } else {
        await cancelPendingOrder(targetId)
        setOrders((prev) => prev.map((o) => (o.id === targetId ? { ...o, status: 'cancelled' } : o)))
      }
    } catch (err) {
      console.error('Error cancelling order:', err)
    } finally {
      setIsDeletingOrder(false)
      setDeletingOrderTarget(null)
    }
  }

  async function handleToggleAutoRenew() {
    if (!user?.id || isTogglingAutoRenew) return
    setIsTogglingAutoRenew(true)
    setSubFeedback(null)
    try {
      const newStatus = !subData.autoRenew
      await toggleSubscriptionAutoRenew({ user, enabled: newStatus })
      if (refreshProfile) await refreshProfile()
      setSubFeedback({
        type: 'success',
        message: newStatus ? 'Auto-renewal enabled for next billing cycle.' : 'Auto-renewal turned off.',
      })
    } catch (err) {
      setSubFeedback({ type: 'error', message: err.message || 'Failed to update auto-renewal.' })
    } finally {
      setIsTogglingAutoRenew(false)
    }
  }

  async function handleCancelSubscription() {
    if (!user?.id || isCancellingSub) return
    setIsCancellingSub(true)
    setSubFeedback(null)
    try {
      await cancelSubscriptionPlan({ user })
      if (refreshProfile) await refreshProfile()
      setIsCancelModalOpen(false)
      setSubFeedback({
        type: 'success',
        message: 'Subscription cancelled. You will continue to enjoy your VIP benefits until the current period expires.',
      })
    } catch (err) {
      setSubFeedback({ type: 'error', message: err.message || 'Failed to cancel subscription.' })
    } finally {
      setIsCancellingSub(false)
    }
  }

  async function handleSaveContactMethods(methods) {
    setIsSavingContacts(true)
    try {
      await updateProfile({ contact_methods: methods })
    } finally {
      setIsSavingContacts(false)
    }
  }

  const roleLabel = isOwner ? 'Owner' : isAdmin ? 'Staff Admin' : 'Customer'
  const roleBadgeColor = isOwner
    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
    : isAdmin
      ? 'bg-[#0b7e74]/10 text-[#0b7e74] border border-[#0b7e74]/20'
      : 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border border-neutral-500/20'

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-5">
      {/* USER PROFILE HEADER */}
      <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <div className="flex flex-col justify-between gap-3.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid size-11 sm:size-13 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#0fa697] to-[#ff655b] text-base sm:text-lg font-black text-white shadow-sm">
              {(profile?.displayName || user?.email)?.slice(0, 2)?.toUpperCase() || 'TD'}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-xl font-black truncate">{profile?.displayName || 'User'}</h1>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${roleBadgeColor}`}>
                  {roleLabel}
                </span>
                {subData.tier !== 'free' && subData.isActive && (
                  <span
                    title={subData.plan.name}
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 shrink-0 ${subData.tier === 'stellar'
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
                      className={`bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent font-bold`}
                    >
                      {subData.plan.name}
                    </span>
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <Link
            to="/settings"
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 self-start rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700 transition hover:bg-neutral-100 hover:text-black dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700 dark:hover:text-white sm:self-auto shadow-sm"
          >
            <Settings className="h-3.5 w-3.5 text-neutral-500" />
            <span>{t('account.settingsBtn')}</span>
          </Link>
        </div>

        {/* 4 QUICK METRICS STRIP (COMPACT & SPACE EFFICIENT) */}
        <div className="mt-3.5 rounded-lg border border-black/5 bg-neutral-50 p-2 sm:p-3 dark:border-white/5 dark:bg-neutral-950/60">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 sm:divide-x divide-black/5 dark:divide-white/5">
            {/* TILE 1: WALLET */}
            <Link
              to="/wallet"
              className="group flex flex-col justify-between rounded-md p-1.5 sm:px-2.5 transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                <span>{t('account.walletTile')}</span>
                <Wallet className="h-3 w-3 text-[#0b7e74]" />
              </div>
              <p className="mt-0.5 text-sm sm:text-base font-black text-[#0b7e74] truncate">
                {formatNumber(profile?.walletBalance || 0)} {t('common.ks')}
              </p>
            </Link>

            {/* TILE 2: ORDERS */}
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className="group cursor-pointer flex flex-col justify-between rounded-md p-1.5 sm:px-2.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                <span>{t('account.ordersTile')}</span>
                <Package className="h-3 w-3 text-[#0b7e74]" />
              </div>
              <p className="mt-0.5 text-sm sm:text-base font-black text-neutral-900 dark:text-white">
                {unifiedOrdersList.length}
              </p>
            </button>

            {/* TILE 3: SERVICE+ WARRANTY */}
            <button
              type="button"
              onClick={() => setActiveTab('warranty')}
              className="group cursor-pointer flex flex-col justify-between rounded-md p-1.5 sm:px-2.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                <span>{t('account.warrantyTile')}</span>
                <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="mt-0.5 text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                {coveredWarrantyCount} Protected
              </p>
            </button>

            {/* TILE 4: VIP MEMBERSHIP */}
            <button
              type="button"
              onClick={() => setActiveTab('subscriptions')}
              className="group cursor-pointer flex flex-col justify-between rounded-md p-1.5 sm:px-2.5 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
            >
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                <span>{t('account.membershipTile')}</span>
                <Sparkles className="h-3 w-3 text-purple-500" />
              </div>
              <p
                className={`mt-0.5 text-sm sm:text-base font-black truncate ${subData.tier === 'stellar'
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent'
                  : subData.tier === 'lunar_plus'
                    ? 'text-purple-600 dark:text-purple-400'
                    : subData.tier === 'lunar'
                      ? 'text-[#0b7e74] dark:text-[#67dccf]'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }`}
              >
                {subData.plan.name}
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* DASHBOARD TAB NAVIGATION BAR (MOBILE HORIZONTALLY SCROLLABLE) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-black/10 dark:border-white/10 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`cursor-pointer shrink-0 flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${activeTab === 'orders'
            ? 'bg-[#0b7e74] text-white shadow-sm'
            : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
        >
          <Package className="h-4 w-4" />
          <span>{t('account.ordersTab')}</span>
          {unifiedOrdersList.length > 0 && (
            <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-mono font-bold">
              {unifiedOrdersList.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('warranty')}
          className={`cursor-pointer shrink-0 flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${activeTab === 'warranty'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{t('account.warrantyTab')}</span>
          {coveredWarrantyCount > 0 && (
            <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-mono font-bold">
              {coveredWarrantyCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={`cursor-pointer shrink-0 flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition ${activeTab === 'subscriptions'
            ? 'bg-purple-600 text-white shadow-sm'
            : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>{t('account.subscriptionsTab')}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ORDERS & CUSTOM REQUESTS */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-5">
          {/* SEARCH, TYPE FILTER & STATUS FILTER BAR */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder={t('account.searchOrders')}
                  className="w-full rounded-lg border border-black/10 bg-white py-2 pl-9 pr-4 text-xs font-semibold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
                />
              </div>

              {/* TYPE FILTERS */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-nowrap rounded-lg border border-black/5 bg-neutral-100/70 p-1 dark:border-white/5 dark:bg-neutral-900/70">
                {[
                  { id: 'all', label: `${t('account.allTypes')} (${unifiedOrdersList.length})` },
                  { id: 'store', label: `${t('account.storeOrders')} (${combinedStoreOrders.length})` },
                  { id: 'custom', label: `${t('account.customOrders')} (${customOrders.length})` },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setOrderTypeFilter(type.id)}
                    className={`cursor-pointer shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition ${orderTypeFilter === type.id
                      ? 'bg-white text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-white'
                      : 'text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white'
                      }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* STATUS FILTERS */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-nowrap pb-1">
              {[
                { id: 'all', label: t('account.allStatuses') },
                { id: 'pending', label: t('account.pending') },
                { id: 'delivered', label: t('account.delivered') },
                { id: 'rejected', label: t('account.rejected') },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setOrderStatusFilter(filter.id)}
                  className={`cursor-pointer shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition ${orderStatusFilter === filter.id
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* ORDERS & CUSTOM REQUESTS LIST */}
          {filteredOrders.length === 0 ? (
            <div className="rounded-xl border border-black/5 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900">
              <Package className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-700" />
              <h4 className="mt-3 text-sm sm:text-base font-bold text-neutral-800 dark:text-neutral-200">
                {t('account.noOrdersTitle')}
              </h4>
              <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
                {t('account.noOrdersDesc')}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <Link
                  to="/store"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0b7e74] px-4 py-2 text-xs font-bold text-white hover:bg-[#096860] transition"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>{t('store.title')}</span>
                </Link>
                <Link
                  to="/custom-order"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 dark:text-white"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#0b7e74]" />
                  <span>{t('store.requestCustomOrder')}</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((item) => {
                const isCustom = item._entryType === 'custom'

                if (isCustom) {
                  // Custom Order Item Card
                  const isPendingQuote = item.status === 'pending_quote'
                  const isQuoted = item.status === 'quoted'
                  const isSubmitted = item.status === 'submitted'
                  const isPaid = item.status === 'paid'
                  const isDelivered = item.status === 'delivered'
                  const isRejected = item.status === 'rejected' || item.status === 'cancelled'

                  const statusBadgeColor = isDelivered
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : isRejected
                      ? 'bg-red-500/10 text-red-500'
                      : isQuoted
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                        : isSubmitted || isPaid
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'

                  const statusLabel =
                    item.status === 'pending_quote'
                      ? t('account.awaitingQuote')
                      : item.status === 'quoted'
                        ? t('account.quotedReadyToPay')
                        : item.status === 'submitted'
                          ? t('orders.reviewing')
                          : item.status === 'paid'
                            ? t('orders.paidProcessing')
                            : item.status === 'delivered'
                              ? t('orders.delivered')
                              : item.status?.replace('_', ' ')

                  return (
                    <div
                      key={`custom-${item.id}`}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-purple-500/20 bg-white p-3 sm:p-4 shadow-sm transition hover:border-purple-500 dark:border-purple-500/20 dark:bg-neutral-900"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                            <Sparkles className="h-3 w-3" /> {t('account.customOrders')}
                          </span>
                          <span className="font-mono text-xs font-black text-neutral-900 dark:text-white">
                            #{item.id.slice(0, 8)}
                          </span>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeColor}`}>
                            {statusLabel}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>

                        <div>
                          <h3 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                            {item.productName}
                          </h3>
                          <p className="text-[10px] sm:text-[11px] text-neutral-500">
                            {item.providerName} • {item.orderType} • {item.targetRegion || 'Global'}
                          </p>
                        </div>

                        {/* ADMIN MESSAGE OR DECLINE REASON */}
                        {item.adminNotes && (
                          <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-1.5 text-xs text-neutral-700 dark:text-neutral-300">
                            <span className="font-bold text-blue-600 dark:text-blue-400">{t('account.adminNote')}: </span>
                            {item.adminNotes}
                          </div>
                        )}
                        {isRejected && item.rejectionReason && (
                          <div className="rounded-md border border-rose-500/20 bg-rose-500/5 p-1.5 text-xs text-rose-600 dark:text-rose-400">
                            <span className="font-bold">{t('account.declineReason')}: </span>
                            {item.rejectionReason}
                          </div>
                        )}
                      </div>

                      {/* RIGHT SIDE: PRICE & ACTIONS */}
                      <div className="flex items-center gap-3 justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-black/5 dark:border-white/5">
                        {item.quotedPriceMmk ? (
                          <div className="text-left md:text-right">
                            <span className="block text-[9px] uppercase font-bold text-neutral-400">{t('orders.totalAmount')}</span>
                            <span className="font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(item.quotedPriceMmk)}
                            </span>
                          </div>
                        ) : (
                          <div className="text-left md:text-right">
                            <span className="block text-[9px] uppercase font-bold text-neutral-400">{t('orders.status')}</span>
                            <span className="text-[11px] font-bold text-amber-500">{t('orders.reviewing')}...</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          {isQuoted && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  navigate(
                                    `/payment?purpose=custom_order&orderId=${item.id}&amount=${item.quotedPriceMmk}`,
                                  )
                                }}
                                className="rounded-lg bg-[#0b7e74] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#096860] transition shadow-sm flex items-center gap-1 cursor-pointer"
                              >
                                <span>{t('orders.payNow')}</span>
                                <ArrowRight className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingOrderTarget(item)}
                                className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                                title={t('orders.cancel')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}

                          {isPendingQuote && (
                            <button
                              type="button"
                              onClick={() => setDeletingOrderTarget(item)}
                              className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-semibold text-neutral-500 hover:text-rose-600 hover:border-rose-500/30 transition cursor-pointer dark:border-white/10"
                            >
                              {t('orders.cancel')}
                            </button>
                          )}

                          {isDelivered && (
                            <button
                              type="button"
                              onClick={() => setDeliveredCustomOrderModal(item)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm cursor-pointer"
                            >
                              <Key className="h-3.5 w-3.5" />
                              <span>{t('orders.revealCode')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }

                // Store Order Item Card
                const isPending =
                  item.status === 'pending_payment' ||
                  item.status === 'submitted' ||
                  item.status === 'processing' ||
                  item.status === 'uploading'
                const isDelivered = item.status === 'delivered' || item.status === 'completed'
                const isRejected = item.status === 'rejected' || item.status === 'declined' || item.status === 'cancelled'

                return (
                  <div
                    key={`store-${item.id}`}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-black/10 bg-white p-3 sm:p-4 shadow-sm transition hover:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-mono text-xs font-black text-neutral-900 dark:text-white">
                          Order #{item.id.slice(0, 8)}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isDelivered
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : isRejected
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                        >
                          {isDelivered
                            ? t('orders.delivered')
                            : isRejected
                              ? t('orders.rejected')
                              : item.status === 'paid'
                                ? t('orders.paidProcessing')
                                : isPending
                                  ? t('orders.pendingPayment')
                                  : t('orders.reviewing')}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>

                      {/* ITEMS LIST PREVIEW */}
                      <div className="flex flex-wrap items-center gap-1 text-xs">
                        {item.items?.map((it, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                          >
                            <span>{it.name}</span>
                            {it.variantName && <span className="text-[10px] text-neutral-400">({it.variantName})</span>}
                            <span className="text-[#0b7e74] font-bold">×{it.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* RIGHT SIDE: PRICE & ACTIONS */}
                    <div className="flex items-center gap-3 justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-black/5 dark:border-white/5">
                      <div className="text-left md:text-right">
                        <span className="block text-[9px] uppercase font-bold text-neutral-400">{t('orders.totalAmount')}</span>
                        <span className="font-mono font-bold text-xs sm:text-sm text-[#0b7e74] dark:text-[#67dccf]">
                          {formatCurrency(item.totalMmk)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isPending && (
                          <>
                            <Link
                              to={`/payment?purpose=order_payment&orderId=${item.id}&amount=${item.totalMmk}`}
                              className="rounded-lg bg-[#0b7e74] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#096860] transition shadow-sm"
                            >
                              {t('orders.payNow')}
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeletingOrderTarget(item)}
                              className="p-1 text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                              title={t('orders.cancel')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}

                        <Link
                          to={`/orders/${item.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition dark:border-white/10 dark:bg-neutral-800 dark:text-white"
                        >
                          <span>{isDelivered ? t('orders.revealCode') : t('orders.details')}</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* CANCEL ORDER / CUSTOM REQUEST CONFIRMATION MODAL */}
          {deletingOrderTarget && (
            <DeleteConfirmModal
              isOpen={Boolean(deletingOrderTarget)}
              title={deletingOrderTarget._entryType === 'custom' ? t('orders.cancelDeleteTitle') : t('orders.cancelDeleteTitle')}
              message={`Are you sure you want to cancel ${deletingOrderTarget._entryType === 'custom'
                ? `Custom Request "${deletingOrderTarget.productName}"`
                : `Order #${deletingOrderTarget.id.slice(0, 8)}`
                }?`}
              isDeleting={isDeletingOrder}
              onConfirm={handleConfirmDeleteOrder}
              onClose={() => setDeletingOrderTarget(null)}
            />
          )}

          {/* DELIVERED CUSTOM ORDER CREDENTIALS MODAL */}
          {deliveredCustomOrderModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
                <div className="flex items-center justify-between border-b border-black/10 pb-3 dark:border-white/10">
                  <div>
                    <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                      {t('account.customOrderDelivery')}
                    </span>
                    <h3 className="font-bold text-base text-black dark:text-white">
                      {deliveredCustomOrderModal.productName}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeliveredCustomOrderModal(null)}
                    className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4">
                  <SecureDeliveryCard
                    order={deliveredCustomOrderModal}
                    orderType="custom_order"
                    onOrderUpdated={(updated) => {
                      setDeliveredCustomOrderModal(updated)
                      setCustomOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SERVICE+ WARRANTY VAULT */}
      {/* ========================================================================= */}
      {activeTab === 'warranty' && (
        <WarrantyTracker orders={orders} profile={profile} />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VIP SUBSCRIPTIONS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-5">
          {subFeedback && (
            <div
              className={`rounded-lg p-3 text-xs font-bold flex items-center justify-between gap-3 ${subFeedback.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                }`}
            >
              <span>{subFeedback.message}</span>
              <button type="button" onClick={() => setSubFeedback(null)} className="cursor-pointer p-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* ACTIVE SUBSCRIPTION OVERVIEW CARD */}
          <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {t('subscriptions.currentTier')}
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <h2
                    className={`text-xl sm:text-2xl font-black ${subData.tier === 'stellar'
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent'
                      : subData.tier === 'lunar_plus'
                        ? 'text-purple-600 dark:text-purple-400'
                        : subData.tier === 'lunar'
                          ? 'text-[#0b7e74] dark:text-[#67dccf]'
                          : 'text-neutral-800 dark:text-neutral-200'
                      }`}
                  >
                    {subData.plan.name}
                  </h2>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${subData.isActive && subData.tier !== 'free'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                      }`}
                  >
                    {subData.tier === 'free' ? t('subscriptions.defaultPlan') : subData.isActive ? t('subscriptions.activeMember') : t('subscriptions.expiredMember')}
                  </span>
                </div>
                {subData.tier !== 'free' && subData.expiresAt && (
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                    {t('subscriptions.renewsOn')}: {new Date(subData.expiresAt).toLocaleDateString()} ({t('subscriptions.daysRemaining', { days: subData.daysRemaining })})
                  </p>
                )}
              </div>

              {/* ACTION: BROWSE ALL PLANS */}
              <Link
                to="/subscriptions"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0b7e74] px-4 py-2 text-xs font-bold text-white hover:bg-[#096860] transition shadow-sm self-start md:self-auto"
              >
                <span>{subData.tier === 'free' ? t('subscriptions.explorePlans') : t('subscriptions.changePlan')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* AUTO-RENEWAL SETTINGS (FOR PAID SUBSCRIBERS) */}
            {subData.tier !== 'free' && (
              <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-black/5 bg-neutral-50 p-3.5 dark:border-white/5 dark:bg-neutral-950/60">
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">
                    {t('subscriptions.autoRenew')} ({subData.autoRenew ? t('subscriptions.autoRenewOn') : t('subscriptions.autoRenewOff')})
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {t('subscriptions.autoRenewDesc')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleAutoRenew}
                    disabled={isTogglingAutoRenew}
                    className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition ${subData.autoRenew
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300'
                      }`}
                  >
                    {isTogglingAutoRenew ? t('common.loading') : subData.autoRenew ? t('subscriptions.autoRenewOn') : t('subscriptions.autoRenewOff')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="cursor-pointer rounded-lg border border-rose-500/30 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:bg-neutral-900 dark:text-rose-400"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}

            {/* PLAN PERKS CHECKLIST */}
            <div className="mt-5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
                {t('account.activeTierPerks')}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(subData.plan.perks || []).map((feat, idx) => {
                  const text = typeof feat === 'string' ? feat : feat.text
                  const isIncluded = typeof feat === 'string' ? true : feat.included !== false
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs font-semibold ${isIncluded
                        ? 'border-black/5 bg-neutral-50 text-neutral-800 dark:border-white/5 dark:bg-neutral-950/40 dark:text-neutral-200'
                        : 'border-black/5 bg-neutral-50/50 text-neutral-400 dark:border-white/5 dark:bg-neutral-950/20 line-through opacity-60'
                        }`}
                    >
                      <CheckCircle2
                        className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${isIncluded ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-300 dark:text-neutral-600'
                          }`}
                      />
                      <span>{text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* CANCEL SUBSCRIPTION CONFIRMATION MODAL */}
          {isCancelModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-xl border border-black/10 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-neutral-900 space-y-3">
                <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-5 w-5" />
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">
                    {t('subscriptions.cancelConfirmTitle')}
                  </h3>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {t('subscriptions.cancelConfirmMsg')}
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(false)}
                    className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    {t('subscriptions.keepMembership')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelSubscription}
                    disabled={isCancellingSub}
                    className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition cursor-pointer"
                  >
                    {isCancellingSub ? t('common.loading') : t('subscriptions.confirmCancellation')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
