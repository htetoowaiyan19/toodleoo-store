import { useEffect, useState } from 'react'
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
} from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../utils/useAuth'
import {
  cancelPendingOrder,
  downloadReceipt,
  getReceiptUrl,
  subscribeUserCollection,
} from '../services/storeService'
import { supabase } from '../supabase'

import { getLocalPendingOrderById, removeLocalPendingOrder } from '../utils/localOrders'
import { DeleteConfirmModal } from '../components/common/DeleteConfirmModal'

export function OrderDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

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
        .or(`order_id.eq.${id},orderId.eq.${id}`)
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



  if (!order) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Package className="mx-auto h-12 w-12 text-neutral-400" />
        <h2 className="mt-4 text-2xl font-black">Order Not Found</h2>
        <p className="mt-2 text-xs font-bold text-neutral-500">
          The requested order ID could not be loaded or may belong to another account.
        </p>
        <Link
          to="/orders"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0b7e74] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#09665e]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Orders
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
          to="/orders"
          className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-neutral-600 hover:text-[#0b7e74] dark:text-neutral-400 dark:hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 p-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback('')} className="cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ORDER HEADER HERO CARD */}
      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/5 pb-6 dark:border-white/5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#0b7e74]">
              Customer Order Invoice
            </span>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl font-mono">
              #{order.id.slice(0, 8)}
            </h1>
            <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-neutral-500">
              <Calendar className="h-3.5 w-3.5 text-[#0b7e74]" />
              <span>Purchased on: {orderDate}</span>
            </p>
          </div>

          {/* STATUS BADGE */}
          <div>
            {isDelivered ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> DELIVERED & COMPLETED
              </span>
            ) : isRejected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-4 py-2 text-xs font-black text-red-500 border border-red-500/20">
                <XCircle className="h-4 w-4" /> ORDER REJECTED
              </span>
            ) : isPending ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-600 border border-rose-500/20 dark:text-rose-400">
                <Clock className="h-4 w-4" /> PENDING PAYMENT
              </span>
            ) : order.status === 'paid' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-4 py-2 text-xs font-black text-blue-600 border border-blue-500/20 dark:text-blue-400">
                <Clock className="h-4 w-4" /> PAID & PROCESSING
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-4 py-2 text-xs font-black text-amber-600 border border-amber-500/20 dark:text-amber-400">
                <Clock className="h-4 w-4" /> AWAITING REVIEW
              </span>
            )}
          </div>
        </div>

        {/* PAYMENT METHOD & TOTAL SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-neutral-50 p-4 dark:bg-neutral-800/40">
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Payment Method</p>
            <p className="mt-1 font-black text-sm text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              {order.paymentSource === 'wallet' ? (
                <>
                  <CreditCard className="h-4 w-4 text-blue-500" /> Wallet Balance Debit
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 text-amber-500" /> Manual Transfer (KBZPay / WavePay)
                </>
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Paid Amount</p>
            <p className="mt-1 font-mono font-black text-xl text-emerald-600 dark:text-emerald-400">
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
            <div className="rounded-2xl border border-[#0b7e74]/20 bg-[#0b7e74]/5 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0b7e74] flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> Provided Order Processing Information
              </h4>

              <div className="rounded-xl border border-black/10 bg-white p-3 space-y-1.5 dark:border-white/10 dark:bg-neutral-900">
                {Object.entries(inputs).map(([label, val]) => (
                  <div key={label} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono">
                    <span className="font-bold text-neutral-500">{label}:</span>
                    <span className="font-bold text-neutral-900 dark:text-white">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* PENDING PAYMENT NOTICE & RESUME ACTIONS */}

        {isPending && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
              <Clock className="h-4 w-4" />
              <span>Order Unfinished / Pending Payment</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Your payment receipt has not been submitted for this order yet. Complete your payment to receive your items.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to={`/payment?purpose=order_payment&orderId=${order.id}&amount=${order.totalMmk}`}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-2xl bg-[#0b7e74] px-6 py-2.5 text-xs font-black text-white shadow-md hover:bg-[#09665e] transition"
              >
                Submit Payment & Upload Receipt →
              </Link>
              <button
                type="button"
                onClick={handleCancelOrder}
                className="cursor-pointer inline-flex items-center gap-1 rounded-2xl border border-rose-500/30 bg-white px-4 py-2.5 text-xs font-bold text-rose-600 shadow-sm hover:bg-rose-50 dark:bg-neutral-900 dark:text-rose-400"
              >
                <X className="h-4 w-4" /> Cancel Order
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DIGITAL PRODUCT DELIVERED CODE & CREDENTIALS BOX */}
      {isDelivered && (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 shadow-sm dark:bg-emerald-950/20 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/10 pb-4">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-[#0b7e74]" />
              <h3 className="text-base font-black text-neutral-900 dark:text-white">
                Digital Product License & Credentials
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {/* REVEAL / HIDE TOGGLE BUTTON */}
              <button
                type="button"
                onClick={() => setIsRevealed((prev) => !prev)}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-bold shadow-sm transition hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200"
              >
                {isRevealed ? (
                  <>
                    <EyeOff className="h-4 w-4 text-neutral-500" /> Hide Credentials
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 text-[#0b7e74]" /> Reveal Code
                  </>
                )}
              </button>

              {/* COPY CODE BUTTON */}
              {isRevealed && order.deliveryMessage && (
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-2xl bg-[#0b7e74] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#09665e]"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* CODE CONTENT BOX */}
          <div>
            {isRevealed ? (
              <div className="relative rounded-2xl border border-black/10 bg-white p-4 font-mono text-sm font-bold text-black shadow-inner dark:border-white/10 dark:bg-neutral-900 dark:text-white whitespace-pre-wrap select-all">
                {order.deliveryMessage || 'Digital product delivered.'}
              </div>
            ) : (
              <div
                onClick={() => setIsRevealed(true)}
                className="group cursor-pointer flex items-center justify-between rounded-2xl border border-dashed border-neutral-300 bg-neutral-100 p-5 font-mono text-sm font-bold text-neutral-400 transition hover:border-[#0b7e74] hover:bg-neutral-200/50 dark:border-neutral-700 dark:bg-neutral-800/60 dark:hover:bg-neutral-800"
              >
                <span className="tracking-widest">••••••••••••••••••••••••••••••••</span>
                <span className="text-xs font-bold text-[#0b7e74] group-hover:underline flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> Click to Reveal Code
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REJECTED NOTICE */}
      {isRejected && (
        <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 shadow-sm space-y-2">
          <h3 className="text-sm font-black text-red-500 flex items-center gap-1.5">
            <RotateCcw className="h-4 w-4" /> Order Declined / Refunded
          </h3>
          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            {order.deliveryMessage || 'This order was declined by the store admin and your wallet balance has been refunded.'}
          </p>
        </div>
      )}

      {/* PURCHASED PRODUCTS RECEIPT TABLE */}
      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-4">
        <h3 className="text-base font-black border-b border-black/5 pb-3 dark:border-white/5">
          Purchased Products Breakdown
        </h3>

        <div className="divide-y divide-black/5 dark:divide-white/5">
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-3 text-xs font-medium">
              <div>
                <p className="font-bold text-sm text-neutral-900 dark:text-white">
                  {item.name} {item.variantName ? `(${item.variantName})` : ''}
                </p>
                <p className="text-neutral-400 mt-0.5">Quantity: {item.quantity}</p>
              </div>

              <div className="text-right">
                <p className="font-mono font-black text-sm text-neutral-800 dark:text-neutral-200">
                  {formatCurrency((item.priceMmk || item.price || 0) * item.quantity)}
                </p>
                {item.quantity > 1 && (
                  <p className="text-[10px] text-neutral-400 font-mono">
                    {formatCurrency(item.priceMmk || item.price || 0)} each
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-black/10 pt-4 font-black text-base dark:border-white/10 text-[#0b7e74]">
          <span>Total Order Price</span>
          <div className="text-right">
            <span className="font-mono">{formatCurrency(order.totalMmk)}</span>
            {order.totalUsd > 0 && (
              <p className="text-xs font-mono font-bold text-neutral-400">
                (${order.totalUsd.toFixed(2)} USD @ {order.exchangeRateUsed || 4500} MMK/USD)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SELECTED CONTACT METHOD PRIORITIES CARD */}
      {(() => {
        const contactMethods = order.contactMethods || order.contact_methods
        if (!Array.isArray(contactMethods) || contactMethods.length === 0) return null

        const feePct = Number(order.contactFeePercent || order.contact_fee_percent || 0)

        return (
          <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-3">
            <div className="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/5">
              <h3 className="text-base font-black">Contact Method Priorities (For 2FA & Support)</h3>
              {feePct > 0 && (
                <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 border border-amber-500/20 dark:text-amber-400">
                  +{feePct}% Fee Included
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {contactMethods.map((cm, idx) => (
                <div key={idx} className="rounded-2xl border border-black/5 bg-neutral-50 p-4 dark:border-white/5 dark:bg-neutral-950/60 font-mono">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {idx === 0 ? '🥇 1st Priority' : idx === 1 ? '🥈 2nd Priority' : '🥉 3rd Priority'}
                  </p>
                  <p className="mt-1 text-xs font-bold text-neutral-800 dark:text-neutral-200">{cm.type}</p>
                  <p className="mt-0.5 text-xs text-[#0b7e74] font-black truncate">{cm.value}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* 5-SECOND COUNTDOWN DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title="Cancel & Delete Order?"
        message={`Are you sure you want to cancel order #${order.id.slice(0, 8)}? Once deleted, this order will be permanently removed.`}
      />
    </section>
  )
}
