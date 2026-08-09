import { Link, useSearchParams } from 'react-router'
import { CheckCircle2, CreditCard, FileText, Home, ShoppingBag, Wallet } from 'lucide-react'
import { formatCurrency } from '../utils/format'

export function OrderSuccessPage() {
  const [params] = useSearchParams()
  const orderId = params.get('orderId') || ''
  const method = params.get('method') || 'wallet'
  const amount = Number(params.get('amount') || 0)
  const type = params.get('type') || (orderId ? 'order' : 'wallet_topup')

  const isWalletPayment = method === 'wallet'
  const isWalletTopup = type === 'wallet_topup'

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-black/10 bg-white p-8 text-center shadow-xl dark:border-white/10 dark:bg-neutral-900 sm:p-12">
        {/* CELEBRATORY CHECKMARK BADGE */}
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-500/10 text-emerald-500 animate-bounce">
          <CheckCircle2 className="h-12 w-12 stroke-[2.5]" />
        </div>

        <p className="mt-6 font-bold uppercase tracking-wider text-[#0b7e74]">
          {isWalletTopup ? 'Top-Up Submitted' : 'Success & Confirmed'}
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          {isWalletTopup ? 'Wallet Top-Up Submitted!' : 'Order Placed Successfully!'}
        </h1>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          {isWalletTopup
            ? 'Thank you! Your transfer receipt screenshot has been received and sent to admin for review.'
            : 'Thank you for your purchase. We have received your order and are processing your digital products.'}
        </p>

        {/* DETAILS SUMMARY BOX */}
        <div className="mt-8 rounded-2xl border border-black/5 bg-neutral-50 p-6 text-left dark:border-white/5 dark:bg-neutral-950">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-black/5 pb-4 dark:border-white/5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                {isWalletTopup ? 'Transaction Type' : 'Order Reference'}
              </p>
              <p className="mt-1 font-mono text-base font-black text-neutral-800 dark:text-neutral-200">
                {isWalletTopup ? '💳 Wallet Recharge' : `#${orderId ? orderId.slice(0, 8) : 'TDL-SUCCESS'}`}
              </p>
            </div>
            {amount > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  {isWalletTopup ? 'Top-Up Amount' : 'Total Amount'}
                </p>
                <p className="mt-1 text-xl font-black text-[#0b7e74]">
                  {formatCurrency(amount)}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-500">Payment Method:</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-200 px-2.5 py-0.5 font-black text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                {isWalletPayment ? <CreditCard className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                {isWalletPayment ? 'Wallet Balance' : 'Manual Transfer'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-500">Status:</span>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-black uppercase text-emerald-600 dark:text-emerald-400">
                {isWalletTopup
                  ? 'Pending Admin Review'
                  : isWalletPayment
                    ? 'Paid & Processing'
                    : 'Receipt Submitted'}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-white p-4 text-xs font-medium text-neutral-600 shadow-sm dark:bg-neutral-900 dark:text-neutral-300">
            {isWalletTopup ? (
              <p>
                📄 Our admin team will verify your transfer screenshot and credit <strong>{formatCurrency(amount)}</strong> directly to your wallet balance shortly.
              </p>
            ) : isWalletPayment ? (
              <p>
                🚀 Your payment has been verified instantly from your wallet balance. Our admin team will dispatch your license keys to your Orders history shortly.
              </p>
            ) : (
              <p>
                📄 Your payment receipt screenshot has been submitted for admin review. Once verified, your digital keys will be delivered to your Orders history.
              </p>
            )}
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/"
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-neutral-950 px-8 py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-[#0b7e74] dark:bg-white dark:text-neutral-950 dark:hover:bg-[#0b7e74] dark:hover:text-white sm:w-auto"
          >
            <Home className="h-4 w-4" />
            Return to Home
          </Link>

          {isWalletTopup ? (
            <Link
              to="/wallet"
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-8 py-3.5 text-sm font-black text-neutral-800 shadow-sm transition hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 sm:w-auto"
            >
              <Wallet className="h-4 w-4" />
              View Wallet Balance →
            </Link>
          ) : (
            <Link
              to="/orders"
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-8 py-3.5 text-sm font-black text-neutral-800 shadow-sm transition hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 sm:w-auto"
            >
              <ShoppingBag className="h-4 w-4" />
              View My Orders →
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
