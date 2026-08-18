import { Link, useSearchParams } from 'react-router'
import { CheckCircle2, CreditCard, FileText, Home, ShoppingBag, Wallet } from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { useTranslation } from '../utils/useTranslation'
import { CheckoutSteps } from '../components/common/CheckoutSteps'

export function OrderSuccessPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const orderId = params.get('orderId') || ''
  const method = params.get('method') || 'wallet'
  const amount = Number(params.get('amount') || 0)
  const type = params.get('type') || (orderId ? 'order' : 'wallet_topup')

  const isWalletPayment = method === 'wallet'
  const isWalletTopup = type === 'wallet_topup'

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 3-STEP PIPELINE HEADER: STEP 3 (COMPLETION) */}
      <CheckoutSteps currentStep={3} />

      <section className="mx-auto max-w-2xl px-3 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-8 text-center shadow-md dark:border-white/10 dark:bg-neutral-900 space-y-3">
          {/* CELEBRATORY CHECKMARK BADGE */}
          <div className="mx-auto grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 stroke-[2.5]" />
          </div>

          <div>
            <p className="font-bold uppercase tracking-wider text-[10px] sm:text-xs text-[#0b7e74]">
              {isWalletTopup ? t('payment.submitReceipt') : t('payment.orderSuccessTitle')}
            </p>
            <h1 className="mt-0.5 text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              {isWalletTopup ? t('payment.topupSuccessTitle') : t('payment.orderSuccessTitle')}
            </h1>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 max-w-md mx-auto">
              {isWalletTopup
                ? t('payment.topupSuccessDesc')
                : t('payment.orderSuccessDesc')}
            </p>
          </div>

          {/* DETAILS SUMMARY BOX */}
          <div className="mt-4 rounded-lg border border-black/5 bg-neutral-50 p-3.5 sm:p-5 text-left dark:border-white/5 dark:bg-neutral-950 space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-black/5 pb-3 dark:border-white/5">
              <div>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {isWalletTopup ? t('common.type') : t('account.orderId')}
                </p>
                <p className="mt-0.5 font-mono text-xs sm:text-sm font-black text-neutral-800 dark:text-neutral-200">
                  {isWalletTopup ? t('payment.accountTopup') : `#${orderId ? orderId.slice(0, 8) : 'TDL-SUCCESS'}`}
                </p>
              </div>
              {amount > 0 && (
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {isWalletTopup ? t('payment.rechargeAmount') : t('payment.totalPayable')}
                  </p>
                  <p className="mt-0.5 text-base sm:text-lg font-black text-[#0b7e74]">
                    {formatCurrency(amount)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-500">Payment:</span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-neutral-200 px-2 py-0.5 font-bold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 text-[10px] sm:text-[11px]">
                  {isWalletPayment ? <CreditCard className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  {isWalletPayment ? t('payment.payWithWallet') : t('payment.manualTransfer')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium text-neutral-500">Status:</span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-bold uppercase text-emerald-600 dark:text-emerald-400 text-[9px] sm:text-[10px]">
                  {isWalletTopup
                    ? 'Pending Review'
                    : isWalletPayment
                      ? 'Paid & Processing'
                      : 'Receipt Submitted'}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-white p-3 text-xs font-medium text-neutral-600 shadow-sm dark:bg-neutral-900 dark:text-neutral-300">
              {isWalletTopup ? (
                <p>
                  Our admin team will verify your transfer screenshot and credit <strong>{formatCurrency(amount)}</strong> directly to your wallet balance shortly.
                </p>
              ) : isWalletPayment ? (
                <p>
                  Your payment has been verified instantly from your wallet balance. Our team will dispatch your license keys to your Orders history shortly.
                </p>
              ) : (
                <p>
                  Your payment receipt has been submitted for admin review. Once verified, your digital keys will be delivered to your Orders history.
                </p>
              )}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="pt-3 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <Link
              to="/"
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-neutral-950 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[#0b7e74] dark:bg-white dark:text-neutral-950 dark:hover:bg-[#0b7e74] dark:hover:text-white sm:w-auto"
            >
              <Home className="h-4 w-4" />
              {t('nav.home')}
            </Link>

            {isWalletTopup ? (
              <Link
                to="/wallet"
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-neutral-800 shadow-sm transition hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 sm:w-auto"
              >
                <Wallet className="h-4 w-4" />
                {t('wallet.title')}
              </Link>
            ) : (
              <Link
                to="/account?tab=orders"
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-neutral-800 shadow-sm transition hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 sm:w-auto"
              >
                <ShoppingBag className="h-4 w-4" />
                {t('account.viewHistory')}
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}


