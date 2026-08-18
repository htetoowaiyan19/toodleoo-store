import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileText,
  Key,
  Maximize2,
  Package,
  RotateCcw,
  X,
  XCircle,
  ShieldCheck,
} from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../utils/useAuth'
import { useTranslation } from '../utils/useTranslation'
import { getUserSubscription } from '../utils/subscriptionPlans'
import { calculateItemWarranty } from '../utils/warrantyUtils'
import {
  cancelPendingOrder,
  downloadReceipt,
  getReceiptUrl,
  subscribeUserCollection,
} from '../services/storeService'
import { supabase } from '../supabase'
import { SecureDeliveryCard } from '../components/delivery/SecureDeliveryCard'

import { getLocalPendingOrderById, removeLocalPendingOrder } from '../utils/localOrders'
import { DeleteConfirmModal } from '../components/common/DeleteConfirmModal'

export function OrderDetailPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const subData = useMemo(() => getUserSubscription(profile), [profile])

  const [orders, setOrders] = useState([])
  const [payment, setPayment] = useState(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [isZoomOpen, setIsZoomOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(
    () => (user ? subscribeUserCollection('orders', user.id, setOrders) : undefined),
    [user?.id],
  )

  const localDraft = useMemo(() => (id?.startsWith('draft-') ? getLocalPendingOrderById(id) : null), [id])
  const order = localDraft || orders.find((o) => o.id === id)

  // Fetch payment transfer proof if manual payment
  useEffect(() => {
    if (!id || !user || id.startsWith('draft-')) return
    let active = true

    async function loadPayment() {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', id)
        .maybeSingle()

      if (active && data) {
        setPayment(data)
        const imgPath = data.receipt_image_path || data.receiptImagePath
        if (imgPath) {
          const url = await getReceiptUrl(imgPath)
          if (active && url) setReceiptUrl(url)
        }
      }
    }

    loadPayment()
    return () => {
      active = false
    }
  }, [id, user])

  // Also check order object directly for receipt
  useEffect(() => {
    if (order?.receiptImagePath || order?.receipt_image_path) {
      getReceiptUrl(order.receiptImagePath || order.receipt_image_path).then((url) => {
        if (url) setReceiptUrl(url)
      })
    }
  }, [order])

  function handleCopyCode() {
    if (!order?.deliveryMessage) return
    navigator.clipboard.writeText(order.deliveryMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleConfirmDelete() {
    if (!order) return
    setIsDeleting(true)
    try {
      if (order.isLocalDraft || order.id.startsWith('draft-')) {
        removeLocalPendingOrder(order.id)
        setFeedback('Pending draft order has been cancelled and deleted.')
        setTimeout(() => navigate('/orders'), 900)
        return
      }

      await cancelPendingOrder(order.id)
      setFeedback('Pending order has been cancelled.')
      setTimeout(() => navigate('/orders'), 1200)
    } catch (err) {
      setFeedback(err.message || 'Failed to cancel order.')
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
  }

  function handleCancelOrder() {
    setIsDeleteModalOpen(true)
  }

  if (!order) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Package className="mx-auto h-12 w-12 text-neutral-400" />
        <h2 className="mt-4 text-2xl font-black">{t('orders.orderNotFoundTitle')}</h2>
        <p className="mt-2 text-xs font-bold text-neutral-500">
          {t('orders.orderNotFoundDesc')}
        </p>
        <Link
          to="/orders"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0b7e74] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#09665e]"
        >
          <ArrowLeft className="h-4 w-4" /> {t('common.back')}
        </Link>
      </section>
    )
  }

  const isPending = order.status === 'pending_payment' || !order.isSubmitted
  const isDelivered = order.status === 'delivered'
  const isRejected = order.status === 'rejected'
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      {/* TOP NAVIGATION LINK */}
      <div className="flex items-center justify-between">
        <Link
          to="/account?tab=orders"
          className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-neutral-600 hover:text-[#0b7e74] dark:text-neutral-400 dark:hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" /> {t('common.back')}
        </Link>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback('')} className="cursor-pointer p-1 text-emerald-600 hover:text-emerald-800">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ORDER HEADER HERO CARD */}
      <div className="rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 pb-4 dark:border-white/5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0b7e74]">
              {t('orders.orderInvoice')}
            </span>
            <h1 className="mt-0.5 text-xl font-black sm:text-2xl font-mono">
              #{order.id.slice(0, 8)}
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
              <Calendar className="h-3.5 w-3.5 text-[#0b7e74]" />
              <span>{t('orders.purchasedOn', { date: orderDate })}</span>
            </p>
          </div>

          {/* STATUS BADGE */}
          <div>
            {isDelivered ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {t('orders.delivered')}
              </span>
            ) : isRejected ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500 border border-red-500/20">
                <XCircle className="h-4 w-4" /> {t('orders.rejected')}
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-600 border border-rose-500/20 dark:text-rose-400">
                <Clock className="h-4 w-4" /> {t('orders.pendingPayment')}
              </span>
            ) : order.status === 'paid' ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-600 border border-blue-500/20 dark:text-blue-400">
                <Clock className="h-4 w-4" /> {t('orders.paidProcessing')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600 border border-amber-500/20 dark:text-amber-400">
                <Clock className="h-4 w-4" /> {t('orders.reviewing')}
              </span>
            )}
          </div>
        </div>

        {/* PAYMENT METHOD & TOTAL SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 rounded-lg bg-neutral-50 p-3.5 dark:bg-neutral-800/40">
          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{t('orders.paymentMethod')}</p>
            <p className="mt-0.5 font-bold text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              {order.paymentSource === 'wallet' ? (
                <>
                  <CreditCard className="h-4 w-4 text-blue-500" /> {t('orders.walletPay')}
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 text-amber-500" /> {t('orders.manualTransfer')}
                </>
              )}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{t('orders.totalPayable')}</p>
            <p className="mt-0.5 font-mono font-black text-lg text-emerald-600 dark:text-emerald-400">
              {formatCurrency(order.totalMmk)}
            </p>
          </div>
        </div>

        {/* SUBMITTED CUSTOMER PROCESSING INFORMATION */}
        {(() => {
          const inputs =
            order.customerInputs || order.items?.find((i) => i.customerInputs)?.customerInputs

          if (!inputs || Object.keys(inputs).length === 0) return null

          return (
            <div className="rounded-lg border border-[#0b7e74]/20 bg-[#0b7e74]/5 p-3.5 space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#0b7e74] flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> {t('orders.providedInfo')}
              </h4>

              <div className="rounded-md border border-black/10 bg-white p-3 space-y-1 dark:border-white/10 dark:bg-neutral-900">
                {Object.entries(inputs).map(([label, val]) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-neutral-500">{label}:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* PENDING PAYMENT NOTICE & RESUME ACTIONS */}
        {isPending && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
              <Clock className="h-4 w-4" />
              <span>{t('orders.pendingNoticeTitle')}</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              {t('orders.pendingNoticeDesc')}
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link
                to={`/payment?purpose=order_payment&orderId=${order.id}&amount=${order.totalMmk}`}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[#0b7e74] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#09665e] transition"
              >
                {t('orders.submitPaymentUpload')}
              </Link>
              <button
                type="button"
                onClick={handleCancelOrder}
                className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 shadow-sm hover:bg-rose-50 dark:bg-neutral-900 dark:text-rose-400"
              >
                <X className="h-3.5 w-3.5" /> {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECURE DIGITAL PRODUCT DELIVERY CARD */}
      {isDelivered && (
        <SecureDeliveryCard
          order={order}
          orderType="order"
          onOrderUpdated={(updated) =>
            setOrders((prev) => prev.map((o) => (o.id === updated?.id ? { ...o, ...updated } : o)))
          }
        />
      )}

      {/* REJECTED NOTICE */}
      {isRejected && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 shadow-sm space-y-1.5">
          <h3 className="text-xs font-bold text-red-500 flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> {t('orders.orderDeclinedRefunded')}
          </h3>
          <p className="text-xs font-normal text-neutral-600 dark:text-neutral-400">
            {order.deliveryMessage || t('orders.orderDeclinedDefaultMsg')}
          </p>
        </div>
      )}

      {/* PURCHASED PRODUCTS RECEIPT TABLE */}
      <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-3">
        <h3 className="text-sm font-black border-b border-black/5 pb-2.5 dark:border-white/5">
          {t('orders.purchasedProductsBreakdown')}
        </h3>

        <div className="divide-y divide-black/5 dark:divide-white/5">
          {order.items?.map((item, idx) => {
            const warranty = calculateItemWarranty({
              item,
              orderDeliveredAt: order.deliveredAt,
              orderCreatedAt: order.createdAt,
              userTier: subData.tier,
            })

            return (
              <div key={idx} className="flex items-center justify-between py-2.5 text-xs font-medium">
                <div>
                  <p className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white">
                    {item.name} {item.variantName ? `(${item.variantName})` : ''}
                  </p>
                  <p className="text-neutral-400 text-[11px] mt-0.5">{t('cart.quantity')}: {item.quantity}</p>

                  {warranty && warranty.hasWarranty && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-3 w-3" />
                        <span>Service+ {warranty.totalMonths}M Warranty ({warranty.statusLabel})</span>
                      </span>
                      {warranty.expiresAt && (
                        <span className="text-[10px] text-neutral-400 font-mono">
                          Valid until {new Date(warranty.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <p className="font-mono font-bold text-xs sm:text-sm text-neutral-800 dark:text-neutral-200">
                    {formatCurrency((item.priceMmk || item.price || 0) * item.quantity)}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-[10px] text-neutral-400 font-mono">
                      {formatCurrency(item.priceMmk || item.price || 0)} {t('orders.each')}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-black/10 pt-3.5 font-bold text-sm dark:border-white/10 text-[#0b7e74]">
          <span>{t('cart.total')}</span>
          <div className="text-right">
            <span className="font-mono font-black text-base">{formatCurrency(order.totalMmk)}</span>
            {order.totalUsd > 0 && (
              <p className="text-[11px] font-mono font-semibold text-neutral-400">
                (${order.totalUsd.toFixed(2)} USD @ {order.exchangeRateUsed || 4500} MMK/USD)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 5-SECOND COUNTDOWN DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title={t('orders.cancelDeleteTitle')}
        message={t('orders.cancelDeleteMsg', { id: order.id.slice(0, 8) })}
      />
    </section>
  )
}

