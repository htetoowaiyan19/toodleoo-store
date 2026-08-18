import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import {
  getAdminWalletAccount,
  processPayment,
} from '../services/storeService'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../utils/useAuth'
import { useTranslation } from '../utils/useTranslation'
import { useCart } from '../utils/useCart'
import { useCoupon } from '../utils/couponContext'
import { getLocalPendingOrderById, removeLocalPendingOrder } from '../utils/localOrders'
import { supabase } from '../supabase'
import { CheckoutSteps } from '../components/common/CheckoutSteps'
import {
  Wallet,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Upload,
  X,
  FileText,
  Lock,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react'

import { getUserSubscription } from '../utils/subscriptionPlans'

export function PaymentPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { t } = useTranslation()
  const { clearCart } = useCart()
  const { removeCoupon } = useCoupon()
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

  const subData = useMemo(() => getUserSubscription(profile), [profile])
  const maxWalletLimit = subData.plan.walletLimitMmk || 1000000

  const purpose = params.get('purpose') || 'wallet_topup' // 'order_payment' | 'custom_order' | 'wallet_topup'
  const orderId = params.get('orderId')
  const presetAmount = Number(params.get('amount') || 0)

  // Local state
  const [amountMmk, setAmountMmk] = useState(presetAmount)
  const [walletAccount, setWalletAccount] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState(purpose === 'wallet_topup' ? 'manual_payment' : 'wallet')
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState('')
  const [copiedPhone, setCopiedPhone] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Draft / Custom order details
  const [draftOrder, setDraftOrder] = useState(() => {
    if (location.state?.draftOrder) return location.state.draftOrder
    if (orderId && orderId.startsWith('draft-')) return getLocalPendingOrderById(orderId)
    return null
  })
  const [customOrder, setCustomOrder] = useState(null)
  const [loadingOrder, setLoadingOrder] = useState(false)
  const [hasPendingTopup, setHasPendingTopup] = useState(false)
  const [pendingTopupData, setPendingTopupData] = useState(null)

  // Check if user has an active pending top-up
  useEffect(() => {
    if (user && purpose === 'wallet_topup') {
      supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('purpose', 'wallet_topup')
        .in('status', ['submitted', 'pending', 'uploading'])
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setHasPendingTopup(true)
            setPendingTopupData(data)
          } else {
            setHasPendingTopup(false)
            setPendingTopupData(null)
          }
        })
    }
  }, [user, purpose])

  // Load Admin wallet details
  useEffect(() => {
    getAdminWalletAccount().then(setWalletAccount)
  }, [])

  // Load custom order if purpose is custom_order
  useEffect(() => {
    if (purpose === 'custom_order' && orderId) {
      setLoadingOrder(true)
      supabase
        .from('custom_orders')
        .select('*')
        .eq('id', orderId)
        .single()
        .then(({ data }) => {
          setLoadingOrder(false)
          if (data) {
            setCustomOrder(data)
            if (!presetAmount) {
              setAmountMmk(data.quoted_price_mmk || 0)
            }
          }
        })
    } else if (purpose === 'order_payment' && !draftOrder && orderId) {
      // Remote store order
      setLoadingOrder(true)
      supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setDraftOrder(data)
            if (data.total_mmk) setAmountMmk(Number(data.total_mmk))
          }
          setLoadingOrder(false)
        })
    }
  }, [purpose, orderId, presetAmount])

  // Handle receipt image selection & preview
  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) {
      setReceiptFile(file)
      setReceiptPreview(URL.createObjectURL(file))
    }
  }

  function handleRemoveReceipt() {
    setReceiptFile(null)
    setReceiptPreview('')
  }

  // Copy phone number helper
  function handleCopyPhone(phone) {
    if (phone) {
      navigator.clipboard.writeText(phone)
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2000)
    }
  }

  const userBalance = Number(profile?.walletBalance || 0)
  const isBalanceSufficient = userBalance >= Number(amountMmk)
  const isWalletPayment = paymentMethod === 'wallet'

  // Centralized Payment Execution
  async function handleExecutePayment(e) {
    if (e) e.preventDefault()
    setErrorMessage('')

    // Validate active top-up blocker
    if (purpose === 'wallet_topup' && hasPendingTopup) {
      setErrorMessage(t('payment.pendingTopupBanner'))
      return
    }

    // Validate top-up limit
    if (purpose === 'wallet_topup') {
      const projectedBalance = userBalance + Number(amountMmk)
      if (projectedBalance > maxWalletLimit) {
        setErrorMessage(
          `This top-up of ${formatCurrency(Number(amountMmk))} would exceed your ${subData.plan.name} wallet limit of ${formatCurrency(maxWalletLimit)}. Please upgrade your plan for higher wallet limits.`,
        )
        return
      }
    }

    setProcessing(true)

    try {
      const result = await processPayment({
        purpose,
        paymentMethod,
        amountMmk: Number(amountMmk),
        user,
        orderId,
        draftOrder,
        receiptFile,
      })

      if (!result.success) {
        setErrorMessage(result.error || 'Payment execution failed. Please check your details.')
        setProcessing(false)
        return
      }

      // If successful, clean up session/cart
      if (orderId && orderId.startsWith('draft-')) {
        removeLocalPendingOrder(orderId)
      }
      if (!location.state?.directItem) {
        clearCart()
      }
      removeCoupon()

      if (isWalletPayment && refreshProfile) {
        await refreshProfile()
      }

      // Navigate to Step 3: Completion
      setTimeout(() => {
        navigate(
          `/order-success?orderId=${result.orderId || ''}&method=${result.method}&amount=${amountMmk}&type=${result.type || purpose}`,
        )
      }, 500)
    } catch (err) {
      console.error('Payment error:', err)
      setErrorMessage(err.message || 'Payment execution failed.')
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 3-STEP PIPELINE HEADER: STEP 2 (PAYMENT) */}
      <CheckoutSteps currentStep={2} />

      <section className="mx-auto grid max-w-7xl gap-4 sm:gap-6 px-3 pb-16 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        {/* LEFT COLUMN: PAYMENT METHOD SELECTOR & SUBMISSION */}
        <div className="space-y-4 sm:space-y-6">
          <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-4">
            <div className="flex items-center justify-between border-b border-black/10 pb-3 dark:border-white/10">
              <div>
                <p className="font-bold text-[11px] sm:text-xs text-[#0b7e74] uppercase tracking-wider">
                  {t('checkout.stepBadge', { step: 2 })}
                </p>
                <h1 className="mt-0.5 text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                  {t('payment.title')}
                </h1>
              </div>

              {purpose === 'order_payment' && (
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" /> {t('common.back')}
                </button>
              )}
            </div>

            {/* ERROR BANNER */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PAYMENT METHOD CHOOSER TABS */}
            <div className="space-y-2">
              <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                {t('payment.chooseMethod')}
              </label>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {/* OPTION 1: WALLET BALANCE */}
                {purpose !== 'wallet_topup' && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    className={`flex flex-col text-left rounded-xl border p-3.5 sm:p-4 transition cursor-pointer ${
                      paymentMethod === 'wallet'
                        ? 'border-[#0b7e74] bg-[#0b7e74]/10 ring-2 ring-[#0b7e74] dark:bg-[#0b7e74]/15'
                        : 'border-black/10 bg-neutral-50 hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-950 dark:hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#0b7e74]/15 text-[#0b7e74] shrink-0">
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-black dark:text-white leading-tight truncate">{t('payment.payWithWallet')}</p>
                          <p className="text-[10px] text-neutral-500 truncate">{t('payment.payWithWalletDesc')}</p>
                        </div>
                      </div>

                      <span className="rounded-md bg-[#0b7e74] px-1.5 py-0.5 text-[9px] font-bold text-white shrink-0">
                        {t('payment.instant')}
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-mono">
                      <span className="text-neutral-500 text-[10px] sm:text-[11px]">{t('payment.walletBalance')}:</span>
                      <span className="font-bold text-black dark:text-white text-xs">{formatCurrency(userBalance)}</span>
                    </div>
                  </button>
                )}

                {/* OPTION 2: MANUAL TRANSFER (KBZPAY / WAVEPAY) */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('manual_payment')}
                  className={`flex flex-col text-left rounded-xl border p-3.5 sm:p-4 transition cursor-pointer ${
                    paymentMethod === 'manual_payment'
                      ? 'border-[#0b7e74] bg-[#0b7e74]/10 ring-2 ring-[#0b7e74] dark:bg-[#0b7e74]/15'
                      : 'border-black/10 bg-neutral-50 hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-950 dark:hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-500/15 text-purple-600 shrink-0">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs sm:text-sm text-black dark:text-white leading-tight truncate">{t('payment.manualTransfer')}</p>
                        <p className="text-[10px] text-neutral-500 truncate">{t('payment.manualTransferDesc')}</p>
                      </div>
                    </div>

                    <span className="rounded-md bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-bold text-purple-600 dark:text-purple-300 shrink-0">
                      {t('payment.transferBadge')}
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs">
                    <span className="text-neutral-500 text-[10px] sm:text-[11px]">{t('payment.adminAccount')}:</span>
                    <span className="font-bold text-black dark:text-white truncate max-w-[130px] sm:max-w-none text-xs">{walletAccount?.displayName || 'Admin Wallet'}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: WALLET PAYMENT DETAILS */}
            {paymentMethod === 'wallet' && (
              <div className="space-y-3 rounded-xl border border-black/10 bg-neutral-50 p-3.5 sm:p-4 dark:border-white/10 dark:bg-neutral-950">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-neutral-500">{t('payment.requiredAmount')}</span>
                  <span className="font-mono text-base sm:text-lg font-black text-[#0b7e74]">{formatCurrency(amountMmk)}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                  <span className="text-xs font-medium text-neutral-500">{t('payment.walletBalance')}</span>
                  <span className="font-mono text-xs font-bold text-black dark:text-white">{formatCurrency(userBalance)}</span>
                </div>

                {isBalanceSufficient ? (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t('payment.sufficientBalance')}</span>
                  </div>
                ) : (
                  <div className="space-y-1 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{t('payment.insufficientWalletBalance')} ({t('payment.shortBy', { amount: formatCurrency(Number(amountMmk) - userBalance) })}).</span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={processing || !isBalanceSufficient}
                  onClick={handleExecutePayment}
                  className="w-full cursor-pointer rounded-lg bg-[#0b7e74] py-3 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-[#096860] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  <span>{processing ? t('common.loading') : `${t('payment.confirmAndPay')} ${formatCurrency(amountMmk)}`}</span>
                </button>
              </div>
            )}

            {/* TAB CONTENT 2: MANUAL PAYMENT (KBZPAY / WAVEPAY) */}
            {paymentMethod === 'manual_payment' && (
              <form onSubmit={handleExecutePayment} className="space-y-3.5 rounded-xl border border-black/10 bg-neutral-50 p-3.5 sm:p-4 dark:border-white/10 dark:bg-neutral-950">
                {/* ACTIVE PENDING TOP-UP BLOCKER NOTICE */}
                {purpose === 'wallet_topup' && hasPendingTopup && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 sm:p-4 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-amber-800 dark:text-amber-300">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{t('payment.pendingTopupTitle')}</span>
                    </div>
                    <p className="leading-relaxed text-[11px] sm:text-xs">
                      {t('payment.pendingTopupDesc', {
                        amount: formatCurrency(pendingTopupData?.amount_mmk || pendingTopupData?.amountMmk || 0),
                        ref: pendingTopupData?.id?.slice(0, 8) || '',
                      })}
                    </p>
                    <div className="pt-1">
                      <Link
                        to="/wallet"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#0b7e74] hover:underline dark:text-[#67dccf]"
                      >
                        <span>{t('payment.viewInWallet')}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}

                {/* ADMIN ACCOUNT CARD */}
                <div className="rounded-lg border border-black/10 bg-white p-3 sm:p-3.5 dark:border-white/10 dark:bg-neutral-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t('payment.transferTo')}</p>
                      <p className="text-xs sm:text-sm font-bold text-black dark:text-white mt-0.5">
                        {walletAccount?.displayName || 'Admin Wallet (KBZPay / WavePay)'}
                      </p>
                    </div>
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                      {t('payment.verified')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-neutral-100 p-2 font-mono text-xs dark:bg-neutral-950 gap-2">
                    <span className="font-bold text-black dark:text-white select-all text-xs truncate">{walletAccount?.phoneNumber || '09-XXXX-XXXX'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(walletAccount?.phoneNumber)}
                      className="cursor-pointer inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-white transition hover:bg-[#0b7e74] dark:bg-white dark:text-black shrink-0"
                    >
                      {copiedPhone ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedPhone ? t('payment.copied') : t('payment.copyNumber')}</span>
                    </button>
                  </div>
                </div>

                {/* TRANSFER AMOUNT INPUT */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    {purpose === 'wallet_topup' ? `${t('payment.rechargeAmount')} (MMK)` : t('payment.transferAmount')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amountMmk}
                    onChange={(e) => setAmountMmk(e.target.value)}
                    disabled={purpose !== 'wallet_topup' || hasPendingTopup}
                    readOnly={purpose !== 'wallet_topup' || hasPendingTopup}
                    className={`mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-xs sm:text-sm font-mono font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900 ${
                      purpose !== 'wallet_topup' || hasPendingTopup
                        ? 'cursor-not-allowed bg-neutral-100 opacity-80 dark:bg-neutral-900'
                        : 'bg-white'
                    }`}
                  />
                  <p className="mt-1 text-xs font-bold text-[#0b7e74]">{formatCurrency(amountMmk)}</p>
                </div>

                {/* RECEIPT FILE UPLOAD */}
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                    {t('payment.uploadScreenshot')} <span className="text-red-500">*</span>
                  </label>

                  {receiptPreview ? (
                    <div className="relative mt-1.5 overflow-hidden rounded-lg border border-black/10 bg-white p-2 dark:border-white/10 dark:bg-neutral-900">
                      <img src={receiptPreview} alt="Receipt Preview" className="h-36 sm:h-44 w-full rounded-md object-contain" />
                      <button
                        type="button"
                        onClick={handleRemoveReceipt}
                        disabled={hasPendingTopup}
                        className="absolute right-2.5 top-2.5 grid h-6.5 w-6.5 place-items-center rounded-md bg-black/70 text-white hover:bg-black"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className={`mt-1.5 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-black/15 bg-white p-4 sm:p-5 text-center transition ${hasPendingTopup ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-[#0b7e74] hover:bg-[#0b7e74]/5'} dark:border-white/15 dark:bg-neutral-900`}>
                      <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-neutral-400" />
                      <span className="mt-1 text-xs font-bold text-black dark:text-white">
                        {t('payment.clickToSelectReceipt')}
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-0.5">{t('payment.receiptHint')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        disabled={hasPendingTopup}
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={processing || !receiptFile || !amountMmk || (purpose === 'wallet_topup' && hasPendingTopup)}
                  className="w-full cursor-pointer rounded-lg bg-gradient-to-r from-[#0fa697] to-[#ff655b] py-3 text-xs sm:text-sm font-bold text-white shadow-md transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>{processing ? t('common.loading') : t('payment.submitReceipt')}</span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TRANSACTION / ORDER SUMMARY SIDEBAR */}
        <aside className="rounded-xl border border-black/10 bg-white p-4 sm:p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900 self-start space-y-3">
          <div className="flex items-center justify-between border-b border-black/10 pb-2.5 dark:border-white/10">
            <h2 className="text-sm sm:text-base font-black">{t('payment.transactionSummary')}</h2>
            <span className="rounded-md bg-[#0b7e74]/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#0b7e74] dark:text-[#67dccf] uppercase">
              {purpose.replace('_', ' ')}
            </span>
          </div>

          {/* STORE ORDER ITEMS LIST */}
          {draftOrder?.items && draftOrder.items.length > 0 && (
            <div className="divide-y divide-black/5 dark:divide-white/5 max-h-56 sm:max-h-60 overflow-y-auto pr-1">
              {draftOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 text-xs font-semibold gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-black dark:text-white leading-tight font-bold truncate">{item.name}</p>
                    {item.variantName && <p className="text-[10px] text-neutral-400 truncate">{t('payment.option')}: {item.variantName}</p>}
                    <p className="text-[10px] text-neutral-500 font-normal mt-0.5">{t('cart.quantity')}: {item.quantity}</p>
                  </div>
                  <span className="font-mono text-neutral-700 dark:text-neutral-300 text-right shrink-0">
                    {formatCurrency((item.priceMmk || item.price) * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* CUSTOM ORDER DETAILS */}
          {customOrder && (
            <div className="rounded-lg bg-neutral-50 p-3 text-xs dark:bg-neutral-950 space-y-1">
              <p className="font-bold text-black dark:text-white text-xs">{customOrder.product_name}</p>
              <p className="text-[11px] text-neutral-500">Provider: {customOrder.provider_name}</p>
              <p className="text-[11px] text-neutral-500">Type: {customOrder.order_type} • {customOrder.target_region || 'Global'}</p>
              {customOrder.quoted_price_usd && (
                <p className="text-[10px] font-bold text-neutral-400">
                  Approx. ${Number(customOrder.quoted_price_usd).toFixed(2)} USD
                </p>
              )}
            </div>
          )}

          {/* WALLET TOPUP DETAILS */}
          {purpose === 'wallet_topup' && (
            <div className="rounded-lg bg-neutral-50 p-3 text-xs dark:bg-neutral-950 space-y-1">
              <p className="font-bold text-black dark:text-white text-xs">{t('payment.accountTopup')}</p>
              <p className="text-[11px] text-neutral-500 truncate">{user?.email}</p>
              <p className="text-[10px] text-neutral-400">{t('payment.topupCreditNotice')}</p>
            </div>
          )}

          {/* TOTAL AMOUNT DUE BOX */}
          <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950 space-y-1 border-t border-black/5 dark:border-white/5 font-mono">
            <div className="flex justify-between text-xs text-neutral-500">
              <span>{t('payment.totalPayable')}</span>
              <span>MMK</span>
            </div>
            <p className="text-lg sm:text-xl font-black text-[#0b7e74] text-right">
              {formatCurrency(amountMmk)}
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-medium text-neutral-400 pt-0.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>{t('payment.secureTransaction')}</span>
          </div>
        </aside>
      </section>
    </div>
  )
}

