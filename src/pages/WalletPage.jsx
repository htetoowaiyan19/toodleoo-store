import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CreditCard, History, PlusCircle, RotateCw } from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../utils/useAuth'
import { subscribeUserCollection } from '../services/storeService'

export function WalletPage() {
  const { profile, user, refreshProfile } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [payments, setPayments] = useState([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(
    () => (user ? subscribeUserCollection('wallet_transactions', user.id, setTransactions) : undefined),
    [user?.id],
  )

  useEffect(
    () => (user ? subscribeUserCollection('payments', user.id, setPayments) : undefined),
    [user?.id],
  )

  const topupRequests = payments.filter((p) => p.purpose === 'wallet_topup')

  async function handleRefresh() {
    setIsRefreshing(true)
    if (refreshProfile) await refreshProfile()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* WALLET HERO CARD */}
      <div className="rounded-3xl bg-neutral-950 p-8 text-white shadow-xl dark:bg-neutral-900 sm:p-10">
        <div className="flex items-center justify-between">
          <p className="font-bold text-[#67dccf] uppercase tracking-wider text-xs">
            Personal Wallet Balance
          </p>
          <CreditCard className="h-6 w-6 text-[#67dccf]" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-4xl font-black sm:text-5xl">
            {formatCurrency(profile?.walletBalance || 0)}
          </h1>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh Wallet Balance"
            className="cursor-pointer rounded-full p-2 text-neutral-400 hover:bg-white/10 hover:text-[#67dccf] transition"
          >
            <RotateCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin text-[#67dccf]' : ''}`} />
          </button>
        </div>
        <Link
          to="/payment?purpose=wallet_topup"
          className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-black text-neutral-950 shadow-md transition hover:bg-[#67dccf] active:scale-[0.98]"
        >
          <PlusCircle className="h-4 w-4" />
          Recharge Wallet
        </Link>
      </div>

      {/* TOP-UP REQUESTS STATUS TRACKER */}
      <div className="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:p-8">
        <div className="flex items-center justify-between border-b border-black/5 pb-4 dark:border-white/5">
          <h2 className="text-xl font-black">Submitted Top-Up Requests</h2>
        </div>

        {topupRequests.length === 0 ? (
          <p className="py-8 text-center text-xs font-bold text-neutral-400">
            No active top-up requests found. Click "Recharge Wallet" to add funds.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
            {topupRequests.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 text-xs">
                <div>
                  <p className="font-bold text-neutral-800 dark:text-neutral-200">
                    Recharge Request via {item.adminWalletAccount || 'Manual Transfer'}
                  </p>
                  <p className="text-neutral-500 font-mono mt-0.5">
                    Ref: #{item.id.slice(0, 8)} • {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(item.amountMmk)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      item.status === 'approved'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : item.status === 'rejected'
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT WALLET TRANSACTIONS */}
      <div className="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:p-8">
        <div className="flex items-center gap-2 border-b border-black/5 pb-4 dark:border-white/5">
          <History className="h-5 w-5 text-[#0b7e74]" />
          <h2 className="text-xl font-black">Transaction History</h2>
        </div>

        {transactions.length === 0 ? (
          <p className="py-8 text-center text-xs font-bold text-neutral-400">
            No transactions recorded yet.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 text-xs">
                <div>
                  <p className="font-bold text-neutral-800 dark:text-neutral-200">
                    {tx.type === 'deposit'
                      ? '➕ Wallet Top-Up Deposit'
                      : tx.type === 'order_refund'
                      ? '🔄 Order Rejection Refund'
                      : '🛒 Order Purchase'}
                  </p>
                  <p className="text-neutral-400 text-[10px] mt-0.5">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
                <span
                  className={`font-mono font-black text-sm ${
                    tx.amount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                  }`}
                >
                  {tx.amount > 0 ? `+${formatCurrency(tx.amount)}` : formatCurrency(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
