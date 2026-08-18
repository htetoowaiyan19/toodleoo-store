import { useMemo, useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  CreditCard,
  History,
  PlusCircle,
  RotateCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Crown,
  Moon,
  Clock,
  AlertCircle,
  Lock,
} from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../utils/useAuth'
import { useTranslation } from '../utils/useTranslation'
import { subscribeUserCollection } from '../services/storeService'
import { getUserSubscription } from '../utils/subscriptionPlans'

export function WalletPage() {
  const { profile, user, refreshProfile } = useAuth()
  const { t } = useTranslation()
  const [transactions, setTransactions] = useState([])
  const [payments, setPayments] = useState([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const subData = useMemo(() => getUserSubscription(profile), [profile])
  const walletBalance = profile?.walletBalance || 0
  const maxWalletLimit = subData.plan.walletLimitMmk || 1000000
  const capacityPercent = Math.min(100, Math.round((walletBalance / maxWalletLimit) * 100))

  useEffect(
    () => (user ? subscribeUserCollection('wallet_transactions', user.id, setTransactions) : undefined),
    [user?.id],
  )

  useEffect(
    () => (user ? subscribeUserCollection('payments', user.id, setPayments) : undefined),
    [user?.id],
  )

  // Detect currently active pending top-up request
  const pendingTopup = useMemo(() => {
    return (
      payments.find(
        (p) =>
          p.purpose === 'wallet_topup' &&
          (p.status === 'submitted' || p.status === 'pending' || p.status === 'uploading'),
      ) || null
    )
  }, [payments])

  const combinedHistory = useMemo(() => {
    // 1. Map existing wallet transactions
    const txList = transactions.map((tx) => {
      const typeLower = (tx.type || '').toLowerCase()
      const isCredit =
        typeLower.includes('topup') ||
        typeLower.includes('deposit') ||
        typeLower.includes('refund') ||
        typeLower.includes('credit') ||
        ['order_refund', 'custom_order_refund', 'topup_approved', 'deposit', 'topup', 'wallet_topup'].includes(typeLower) ||
        (typeLower !== 'purchase_debit' && typeLower !== 'subscription' && typeLower !== 'custom_order' && typeLower !== 'debit' && Number(tx.amountMmk ?? tx.amount ?? 0) > 0)

      const amountVal = Math.abs(Number(tx.amountMmk ?? tx.amount ?? 0))

      let title = t('wallet.credit')
      if (typeLower === 'topup_approved' || typeLower === 'topup' || typeLower === 'deposit' || typeLower === 'wallet_topup') {
        title = t('wallet.credit')
      } else if (typeLower.includes('refund')) {
        title = 'Order Refund'
      } else if (typeLower === 'subscription') {
        title = t('account.subscriptionsTab')
      } else if (typeLower === 'custom_order') {
        title = t('account.customOrders')
      } else if (!isCredit) {
        title = t('wallet.debit')
      }

      return {
        id: `tx-${tx.id}`,
        type: tx.type,
        amountMmk: amountVal,
        isCredit,
        status: 'completed',
        title,
        subtitle: tx.description || (tx.orderId ? `Order #${tx.orderId.slice(0, 8)}` : null),
        createdAt: tx.createdAt || 0,
        paymentId: tx.paymentId || tx.payment_id || null,
      }
    })

    const recordedPaymentIds = new Set(
      txList.map((t) => t.paymentId).filter(Boolean),
    )

    // 2. Map topup requests from payments collection
    const topupList = payments
      .filter((p) => p.purpose === 'wallet_topup')
      .filter((p) => {
        if (
          p.status === 'approved' &&
          (recordedPaymentIds.has(p.id) ||
            txList.some((tx) => tx.type?.includes('topup') && tx.amountMmk === Number(p.amountMmk)))
        ) {
          return false
        }
        return true
      })
      .map((p) => ({
        id: `pay-${p.id}`,
        type: 'topup_request',
        amountMmk: Number(p.amountMmk || 0),
        isCredit: true,
        status: p.status, // 'submitted' | 'pending' | 'approved' | 'rejected'
        title: `Recharge via ${p.adminWalletAccount || 'Mobile Banking'}`,
        subtitle: `Ref: #${p.id.slice(0, 8)}`,
        createdAt: p.createdAt || 0,
      }))

    return [...topupList, ...txList].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    )
  }, [transactions, payments, t])

  async function handleRefresh() {
    setIsRefreshing(true)
    if (refreshProfile) await refreshProfile()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* WALLET HERO CARD */}
      <div className="rounded-xl bg-neutral-950 p-6 text-white shadow-xl dark:bg-neutral-900 sm:p-8 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-bold text-[#67dccf] uppercase tracking-wider text-xs">
              {t('wallet.currentBalance')}
            </p>
            <Link
              to="/subscriptions"
              title={subData.plan.name}
              className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 sm:px-2 text-[10px] font-bold hover:bg-white/20 transition shrink-0"
            >
              {subData.tier === 'stellar' ? (
                <Crown className="h-3 w-3 text-amber-400" />
              ) : subData.tier === 'lunar_plus' ? (
                <Sparkles className="h-3 w-3 text-purple-400" />
              ) : subData.tier === 'lunar' ? (
                <Moon className="h-3 w-3 text-[#67dccf]" />
              ) : (
                <ShieldCheck className="h-3 w-3 text-neutral-400" />
              )}
              <span
                className={`hidden sm:inline ${
                  subData.tier === 'stellar'
                    ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-bold'
                    : subData.tier === 'lunar_plus'
                      ? 'text-purple-300'
                      : subData.tier === 'lunar'
                        ? 'text-[#67dccf]'
                        : 'text-neutral-300'
                }`}
              >
                {subData.plan.name}
              </span>
            </Link>
          </div>
          <CreditCard className="h-5 w-5 text-[#67dccf]" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black sm:text-4xl font-mono">
              {formatCurrency(walletBalance)}
            </h1>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh Wallet Balance"
              className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-[#67dccf] transition"
            >
              <RotateCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-[#67dccf]' : ''}`} />
            </button>
          </div>

          {/* CAPACITY USAGE */}
          <div className="text-left sm:text-right text-xs">
            <p className="text-neutral-400">
              Capacity: <span className="font-bold text-white">{formatCurrency(maxWalletLimit)} Max</span>
            </p>
            <div className="mt-1.5 h-1.5 w-40 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0b7e74] to-[#67dccf] transition-all duration-300"
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
          {pendingTopup ? (
            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/20 border border-amber-500/30 px-4 py-2.5 text-xs font-bold text-amber-300 select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
              </span>
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>Top-up In Review</span>
            </div>
          ) : (
            <Link
              to="/payment?purpose=wallet_topup"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-bold text-neutral-950 shadow-sm transition hover:bg-[#67dccf] active:scale-[0.99]"
            >
              <PlusCircle className="h-4 w-4" />
              {t('wallet.rechargeWallet')}
            </Link>
          )}

          <Link
            to="/subscriptions"
            className="inline-flex items-center justify-center sm:justify-start gap-1 text-xs font-semibold text-[#67dccf] hover:underline"
          >
            <span>{t('wallet.subtitle')}</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ACTIVE PENDING TOP-UP REQUEST STATUS TRACKER (BLOCKS FURTHER REQUESTS) */}
      {pendingTopup && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 shadow-sm space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg bg-amber-500/20 p-2 text-amber-600 dark:text-amber-400 shrink-0">
                <Clock className="h-4 w-4 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-300">
                  Top-up Request Under Review
                </h2>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  Ref: #{pendingTopup.id.slice(0, 8)} •{' '}
                  {pendingTopup.createdAt ? new Date(pendingTopup.createdAt).toLocaleString() : 'Just now'}
                </p>
              </div>
            </div>

            <span className="self-start sm:self-auto rounded-md bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
              {pendingTopup.status === 'submitted' ? 'Awaiting Verification' : pendingTopup.status}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-lg bg-white/70 dark:bg-neutral-850 p-3 border border-black/5 dark:border-white/5 space-y-0.5">
              <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Top-up Amount</p>
              <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(pendingTopup.amountMmk)}
              </p>
            </div>

            <div className="rounded-lg bg-white/70 dark:bg-neutral-850 p-3 border border-black/5 dark:border-white/5 space-y-0.5">
              <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Payment Account</p>
              <p className="font-bold text-neutral-800 dark:text-neutral-200">
                {pendingTopup.adminWalletAccount || 'Mobile Banking'}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2.5 leading-relaxed">
            <Lock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              New top-up requests are temporarily locked while our administrators verify your payment slip. Once approved, your wallet balance will automatically update.
            </span>
          </div>
        </div>
      )}

      {/* COMBINED RECENT WALLET TRANSACTIONS & TOP-UP ACTIVITY */}
      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:p-6">
        <div className="flex items-center gap-2 border-b border-black/5 pb-3.5 dark:border-white/5">
          <History className="h-4 w-4 text-[#0b7e74]" />
          <h2 className="text-base sm:text-lg font-black">{t('wallet.transactionHistory')}</h2>
        </div>

        {combinedHistory.length === 0 ? (
          <p className="py-6 text-center text-xs font-medium text-neutral-400">
            {t('wallet.noTransactions')}
          </p>
        ) : (
          <div className="mt-3 divide-y divide-black/5 dark:divide-white/5">
            {combinedHistory.map((item) => {
              const amountVal = Math.abs(item.amountMmk)
              const isPending = item.status === 'pending' || item.status === 'submitted'
              const isRejected = item.status === 'rejected'
              const isApproved = item.status === 'approved'

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3 text-xs"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-neutral-900 dark:text-white">{item.title}</p>
                      {item.type === 'topup_request' && (
                        <span
                          className={`rounded-md px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : isRejected
                                ? 'bg-red-500/10 text-red-500'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-400 text-[10px] font-mono truncate">
                      {item.subtitle ? `${item.subtitle} • ` : ''}
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>

                  <span
                    className={`font-mono font-bold text-xs sm:text-sm text-right shrink-0 pl-2 ${
                      item.isCredit
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-500 dark:text-rose-400'
                    }`}
                  >
                    {item.isCredit ? `+${formatCurrency(amountVal)}` : `-${formatCurrency(amountVal)}`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

