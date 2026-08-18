import { useEffect, useMemo, useState } from 'react'
import {
  deleteAdminOrder,
  deleteAdminPayment,
  deliverOrder,
  downloadReceipt,
  getReceiptUrl,
  rejectAndRefundOrder,
  reviewPayment,
  subscribeAdminCollection,
} from '../services/storeService'
import {
  Check,
  CreditCard,
  Download,
  Eye,
  FileText,
  Key,
  Maximize2,
  Package,
  Search,
  Send,
  Trash2,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Calendar,
  Lock,
  Phone,
  ShieldCheck,
  Shield,
  Tag,
  ExternalLink,
} from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../utils/useAuth'
import { useTranslation } from '../utils/useTranslation'
import { DeleteConfirmModal } from '../components/common/DeleteConfirmModal'

export function AdminOrdersPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [messages, setMessages] = useState({})
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'review' | 'ready' | 'delivered' | 'wallet'
  const [inspectTarget, setInspectTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [receiptModalUrl, setReceiptModalUrl] = useState('')
  const [receiptUrlMap, setReceiptUrlMap] = useState({})
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => subscribeAdminCollection('orders', setOrders), [])
  useEffect(() => subscribeAdminCollection('payments', setPayments), [])

  useEffect(() => {
    let isMounted = true

    async function loadReceiptUrls() {
      const newUrls = {}
      for (const p of payments) {
        const imgPath = p.receiptImagePath || p.receipt_image_path
        if (imgPath) {
          const url = await getReceiptUrl(imgPath)
          if (url) newUrls[p.id] = url
        }
      }
      for (const o of orders) {
        const imgPath = o.receiptImagePath || o.receipt_image_path
        if (imgPath) {
          const url = await getReceiptUrl(imgPath)
          if (url) newUrls[o.id] = url
        }
      }

      if (isMounted && Object.keys(newUrls).length > 0) {
        setReceiptUrlMap(newUrls)
      }
    }

    loadReceiptUrls()
    return () => {
      isMounted = false
    }
  }, [orders, payments])

  useEffect(() => {
    if (!inspectTarget) return
    if (inspectTarget.isPayment) {
      const updated = payments.find((p) => p.id === inspectTarget.id)
      if (updated) {
        setInspectTarget((prev) => ({
          ...prev,
          ...updated,
          status: updated.status === 'approved' ? 'delivered' : updated.status === 'rejected' ? 'rejected' : 'reviewing',
          isPayment: true,
        }))
      }
    } else {
      const updated = orders.find((o) => o.id === inspectTarget.id)
      if (updated) {
        const payment = payments.find(
          (p) =>
            p.orderId === updated.id ||
            p.order_id === updated.id ||
            (p.userId === updated.userId && updated.paymentSource === 'manual_payment'),
        )
        setInspectTarget((prev) => ({ ...prev, ...updated, payment, isPayment: false }))
      }
    }
  }, [orders, payments])

  // UI Action: Approve or Reject manual payment with in-modal state update (No full page reload!)
  async function handleReviewPayment(payment, newStatus) {
    try {
      await reviewPayment({
        admin: user,
        payment,
        reviewNote: '',
        status: newStatus,
      })

      const nowIso = new Date().toISOString()
      const isWalletTopup = payment.purpose === 'wallet_topup' || inspectTarget?.isPayment

      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id ? { ...p, status: newStatus, reviewedAt: nowIso } : p,
        ),
      )

      const targetOrderId = payment.orderId || payment.order_id
      if (targetOrderId) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === targetOrderId
              ? { ...o, status: newStatus === 'approved' ? 'paid' : 'rejected' }
              : o,
          ),
        )
      }

      // Update inspect modal target model in-place so admin sees the state change cleanly without closing modal or refreshing
      setInspectTarget((prev) => {
        if (!prev) return null
        if (prev.isPayment || isWalletTopup) {
          return {
            ...prev,
            status: newStatus === 'approved' ? 'delivered' : 'rejected',
            payment: prev.payment ? { ...prev.payment, status: newStatus } : { ...prev, status: newStatus },
          }
        }
        return {
          ...prev,
          status: newStatus === 'approved' ? 'paid' : 'rejected',
          payment: prev.payment ? { ...prev.payment, status: newStatus } : prev.payment,
        }
      })

      setFeedback(
        isWalletTopup && newStatus === 'approved'
          ? `Wallet top-up #${payment.id.slice(0, 8)} approved and deposited! Status marked Delivered.`
          : `Payment proof #${payment.id.slice(0, 8)} ${newStatus} successfully!`,
      )
    } catch (err) {
      setFeedback(err.message || 'Failed to update payment status.')
    }
  }

  // Action: Deliver order with digital license keys
  async function handleDeliver(order) {
    try {
      const msg = messages[order.id] ?? order.deliveryMessage ?? ''
      await deliverOrder({
        admin: user,
        deliveryMessage: msg,
        orderId: order.id,
      })

      const nowIso = new Date().toISOString()

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, status: 'delivered', deliveryMessage: msg, deliveredAt: nowIso }
            : o,
        ),
      )

      setInspectTarget((prev) =>
        prev
          ? {
            ...prev,
            status: 'delivered',
            deliveryMessage: msg,
            deliveredAt: nowIso,
          }
          : null,
      )

      setFeedback(`Order #${order.id.slice(0, 8)} delivered! Customer notified.`)
    } catch (err) {
      setFeedback(err.message || 'Failed to deliver order.')
    }
  }

  // Action: Reject & Refund Order
  async function handleRejectAndRefund(order) {
    try {
      await rejectAndRefundOrder(order.id, rejectReason)

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
              ...o,
              status: 'rejected',
              deliveryMessage: rejectReason || 'Order rejected by admin.',
            }
            : o,
        ),
      )

      setInspectTarget((prev) =>
        prev
          ? {
            ...prev,
            status: 'rejected',
            deliveryMessage: rejectReason || 'Order rejected by admin.',
          }
          : null,
      )

      setRejectReason('')
      setFeedback(`Order #${order.id.slice(0, 8)} rejected and wallet balance refunded.`)
    } catch (err) {
      setFeedback(err.message || 'Failed to reject and refund order.')
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      if (deleteTarget.isPaymentDelete) {
        await deleteAdminPayment(deleteTarget.id)
        setPayments((prev) => prev.filter((p) => p.id !== deleteTarget.id))
        setFeedback(`Wallet topup #${deleteTarget.id.slice(0, 8)} removed.`)
      } else {
        await deleteAdminOrder(deleteTarget.id)
        setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id))
        setFeedback(`Order #${deleteTarget.id.slice(0, 8)} removed from admin view.`)
      }
      setDeleteTarget(null)
      if (inspectTarget?.id === deleteTarget.id) setInspectTarget(null)
    } catch (err) {
      setFeedback(err.message || 'Failed to delete item.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function openZoomModal(imagePathOrUrl) {
    if (!imagePathOrUrl) return
    const url = receiptUrlMap[imagePathOrUrl] || (await getReceiptUrl(imagePathOrUrl))
    setReceiptModalUrl(url)
  }

  function appendSnippet(orderId, snippet) {
    setMessages((prev) => {
      const existing = prev[orderId] || ''
      return { ...prev, [orderId]: existing ? `${existing}\n${snippet}` : snippet }
    })
  }

  const walletTopups = useMemo(
    () => payments.filter((p) => p.purpose === 'wallet_topup'),
    [payments],
  )

  const processedOrders = useMemo(() => {
    return orders.map((order) => {
      const payment = payments.find(
        (p) =>
          p.orderId === order.id ||
          p.order_id === order.id ||
          (p.userId === order.userId && order.paymentSource === 'manual_payment'),
      )
      return { ...order, payment, isPayment: false }
    })
  }, [orders, payments])

  const combinedItems = useMemo(() => {
    const topupItems = walletTopups.map((p) => ({
      id: p.id,
      userId: p.userId,
      userEmail: p.userEmail,
      totalMmk: p.amountMmk,
      createdAt: p.createdAt,
      status: p.status === 'approved' ? 'delivered' : p.status === 'rejected' ? 'rejected' : 'reviewing',
      paymentSource: 'manual_payment',
      items: [{ name: 'Wallet Top-Up Deposit', quantity: 1, priceMmk: p.amountMmk }],
      payment: p,
      isPayment: true,
    }))

    if (activeTab === 'wallet') return topupItems

    if (activeTab === 'all') {
      return [...processedOrders, ...topupItems].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      )
    }

    return processedOrders
  }, [processedOrders, walletTopups, activeTab])

  const counts = useMemo(() => {
    const reviewCount = processedOrders.filter(
      (o) => (o.payment && o.payment.status === 'submitted') || (o.status === 'pending_payment' && Boolean(o.receiptImagePath)),
    ).length
    const readyCount = processedOrders.filter(
      (o) => (o.status === 'paid' || o.status === 'submitted') && !o.deliveryMessage,
    ).length
    const deliveredCount = processedOrders.filter((o) => o.status === 'delivered').length + walletTopups.filter((p) => p.status === 'approved').length
    const walletCount = walletTopups.filter((p) => p.status === 'submitted').length
    return {
      all: processedOrders.length + walletTopups.length,
      review: reviewCount,
      ready: readyCount,
      delivered: deliveredCount,
      wallet: walletCount,
    }
  }, [processedOrders, walletTopups])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return combinedItems.filter((item) => {
      const matchesSearch =
        !q ||
        item.id.toLowerCase().includes(q) ||
        (item.userEmail && item.userEmail.toLowerCase().includes(q)) ||
        (item.items && item.items.some((i) => i.name.toLowerCase().includes(q)))

      if (!matchesSearch) return false

      if (activeTab === 'review') {
        return !item.isPayment && ((item.payment && item.payment.status === 'submitted') || (item.status === 'pending_payment' && Boolean(item.receiptImagePath)))
      }
      if (activeTab === 'ready') {
        return !item.isPayment && (item.status === 'paid' || item.status === 'submitted') && !item.deliveryMessage
      }
      if (activeTab === 'delivered') return item.status === 'delivered' || (item.isPayment && item.status === 'delivered')
      return true
    })
  }, [combinedItems, activeTab, search])

  // Is current inspection target locked in a finalized read-only status?
  const isTargetFinalized = Boolean(
    inspectTarget &&
    (inspectTarget.status === 'delivered' ||
      inspectTarget.status === 'approved' ||
      inspectTarget.status === 'rejected' ||
      (inspectTarget.isPayment && inspectTarget.status !== 'submitted' && inspectTarget.status !== 'reviewing')),
  )

  return (
    <section className="space-y-6">
      {/* HEADER TITLE */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-bold text-[#0b7e74]">{t('admin.subtitle')}</p>
          <h1 className="mt-1 text-3xl font-black">{t('admin.orders.title')}</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            {t('admin.orders.subtitle')}
          </p>
        </div>

        {/* TAB FILTER BUTTONS */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-nowrap rounded-lg border border-black/10 bg-neutral-100 p-1 dark:border-white/10 dark:bg-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`cursor-pointer shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition ${activeTab === 'all'
              ? 'bg-white text-black shadow-sm dark:bg-neutral-900 dark:text-white'
              : 'text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              }`}
          >
            {t('admin.orders.allTab', { count: counts.all })}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${activeTab === 'review'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              }`}
          >
            <span>{t('admin.orders.reviewTab')}</span>
            {counts.review > 0 && (
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-black text-amber-600">
                {counts.review}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ready')}
            className={`cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${activeTab === 'ready'
              ? 'bg-[#0b7e74] text-white shadow-sm'
              : 'text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              }`}
          >
            <span>{t('admin.orders.readyTab')}</span>
            {counts.ready > 0 && (
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-black text-[#0b7e74]">
                {counts.ready}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delivered')}
            className={`cursor-pointer shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-bold transition ${activeTab === 'delivered'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              }`}
          >
            {t('admin.orders.deliveredTab', { count: counts.delivered })}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className={`cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${activeTab === 'wallet'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white'
              }`}
          >
            <span>{t('admin.orders.walletTab')}</span>
            {counts.wallet > 0 && (
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-black text-blue-600">
                {counts.wallet}
              </span>
            )}
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback('')} className="cursor-pointer p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
        <input
          type="text"
          placeholder={t('admin.orders.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white pl-9 pr-4 py-2 text-xs font-semibold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
        />
      </div>

      {/* ORDERS & PAYMENTS TABLE */}
      <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        {filteredItems.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">
            <Package className="mx-auto h-8 w-8 text-neutral-400" />
            <p className="mt-2 text-sm font-bold">{t('admin.orders.noOrders')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-black/10 bg-neutral-50 font-bold uppercase tracking-wider text-neutral-500 dark:border-white/10 dark:bg-neutral-800/50">
                <tr>
                  <th className="p-2.5">{t('admin.orders.orderRef')}</th>
                  <th className="p-2.5">{t('admin.orders.customerEmail')}</th>
                  <th className="p-2.5">{t('admin.orders.itemsPurchased')}</th>
                  <th className="p-2.5">{t('admin.orders.totalAmount')}</th>
                  <th className="p-2.5">{t('admin.orders.paymentSource')}</th>
                  <th className="p-2.5">{t('admin.orders.status')}</th>
                  <th className="p-2.5">{t('admin.orders.orderDate')}</th>
                  <th className="p-2.5 text-right">{t('admin.orders.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredItems.map((item) => {
                  const receiptUrl = receiptUrlMap[item.id] || (item.payment && receiptUrlMap[item.payment.id])
                  const orderDate = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'

                  return (
                    <tr key={item.id} className="transition hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-[#0b7e74] bg-[#0b7e74]/10 px-2 py-0.5 rounded-md text-[11px]">
                            #{item.id.slice(0, 8)}
                          </span>
                          {receiptUrl && (
                            <button
                              type="button"
                              onClick={() => openZoomModal(receiptUrl)}
                              className="cursor-pointer p-1 text-neutral-400 hover:text-black dark:hover:text-white"
                              title={t('admin.orders.viewReceipt')}
                            >
                              <FileText className="h-3.5 w-3.5 text-amber-500" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="p-2.5 font-bold">{item.userEmail || 'Customer'}</td>

                      <td className="p-2.5">
                        {item.items && item.items.length > 0 ? (
                          <div className="space-y-0.5">
                            {item.items.map((it, idx) => (
                              <div key={idx} className="font-semibold text-neutral-800 dark:text-neutral-200">
                                {it.name} {it.variantName ? `(${it.variantName})` : ''} × {it.quantity}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-neutral-400">Standard Item</span>
                        )}
                      </td>

                      <td className="p-2.5 font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.totalMmk)}
                      </td>

                      <td className="p-2.5">
                        {item.paymentSource === 'wallet' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            <CreditCard className="h-3 w-3" /> {t('admin.orders.walletPay')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <FileText className="h-3 w-3" /> {t('admin.orders.manualTransfer')}
                          </span>
                        )}
                      </td>

                      <td className="p-2.5">
                        {item.status === 'delivered' || item.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> {item.isPayment ? t('admin.orders.deliveredDeposited') : t('admin.orders.delivered')}
                          </span>
                        ) : item.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            <Clock className="h-3 w-3" /> {t('admin.orders.paidProcessing')}
                          </span>
                        ) : item.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">
                            <XCircle className="h-3 w-3" /> {t('admin.orders.rejected')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <Clock className="h-3 w-3" /> {t('admin.orders.reviewing')}
                          </span>
                        )}
                      </td>

                      <td className="p-2.5 text-neutral-500 font-medium">{orderDate}</td>

                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectTarget(item)}
                            className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-[#0b7e74]/10 px-2.5 py-1 text-xs font-bold text-[#0b7e74] hover:bg-[#0b7e74] hover:text-white transition"
                          >
                            <Eye className="h-3.5 w-3.5" /> {t('admin.orders.inspect')}
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget({ id: item.id, isPaymentDelete: item.isPayment })}
                            className="cursor-pointer p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                            title={t('admin.orders.deleteRecord')}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT DETAIL MODAL */}
      {inspectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-black/10 pb-3.5 dark:border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0b7e74]">
                    {inspectTarget.isPayment ? t('admin.orders.inspectWallet') : t('admin.orders.inspectOrder')}
                  </span>
                </div>
                <h2 className="mt-0.5 text-lg sm:text-xl font-black">
                  #{inspectTarget.id.slice(0, 8)} - {inspectTarget.userEmail}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInspectTarget(null)}
                className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {/* DATE OF PURCHASE & STATUS BADGE */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-neutral-50 p-3.5 dark:bg-neutral-800/40">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-300">
                  <Calendar className="h-4 w-4 text-[#0b7e74]" />
                  <span>
                    {inspectTarget.isPayment ? t('admin.orders.dateOfDeposit') : t('admin.orders.dateOfPurchase')}:{' '}
                    <strong className="text-black dark:text-white">
                      {inspectTarget.createdAt ? new Date(inspectTarget.createdAt).toLocaleString() : 'N/A'}
                    </strong>
                  </span>
                </div>

                <div>
                  {inspectTarget.status === 'delivered' || (inspectTarget.isPayment && inspectTarget.status === 'approved') ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {inspectTarget.isPayment ? t('admin.orders.deliveredDeposited') : t('admin.orders.delivered')}
                    </span>
                  ) : inspectTarget.status === 'rejected' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 py-0.5 text-xs font-bold text-red-500 border border-red-500/20">
                      <XCircle className="h-3.5 w-3.5" /> {t('admin.orders.rejected')}
                    </span>
                  ) : inspectTarget.status === 'paid' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <Clock className="h-3.5 w-3.5" /> {t('admin.orders.paidProcessing')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <Clock className="h-3.5 w-3.5" /> {t('admin.orders.awaitingReview')}
                    </span>
                  )}
                </div>
              </div>

              {/* CUSTOMER SUBMITTED PROCESSING INFORMATION */}
              {(() => {
                const inputs =
                  inspectTarget.customerInputs ||
                  inspectTarget.items?.find((i) => i.customerInputs)?.customerInputs

                if (!inputs || Object.keys(inputs).length === 0) return null

                return (
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> {t('admin.orders.customerInfo')}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const text = Object.entries(inputs)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join('\n')
                          navigator.clipboard.writeText(text)
                          setFeedback(t('admin.orders.infoCopied'))
                        }}
                        className="cursor-pointer text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        {t('admin.orders.copyInfo')}
                      </button>
                    </div>

                    <div className="rounded-lg border border-black/10 bg-white p-2.5 space-y-1 dark:border-white/10 dark:bg-neutral-900">
                      {Object.entries(inputs).map(([label, val]) => (
                        <div key={label} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono">
                          <span className="font-bold text-neutral-500">{label}:</span>
                          <span className="font-bold text-neutral-900 dark:text-white select-all">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* CUSTOMER CONTACT PRIORITIES FOR 2FA & SUPPORT */}
              {(() => {
                const contactMethods = inspectTarget.contactMethods || inspectTarget.contact_methods
                if (!Array.isArray(contactMethods) || contactMethods.length === 0) return null

                const feePct = Number(inspectTarget.contactFeePercent || inspectTarget.contact_fee_percent || 0)

                return (
                  <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> {t('admin.orders.contactPriorities')}
                      </h4>
                      {feePct > 0 && (
                        <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 border border-purple-500/20 dark:text-purple-300">
                          {t('admin.orders.feeIncluded', { fee: feePct })}
                        </span>
                      )}
                    </div>

                    <div className="rounded-lg border border-black/10 bg-white p-2.5 space-y-1.5 dark:border-white/10 dark:bg-neutral-900">
                      {contactMethods.map((cm, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono border-b border-black/5 dark:border-white/5 pb-1 last:border-0 last:pb-0 gap-1">
                          <span className="font-bold text-neutral-500">
                            {idx === 0 ? t('admin.orders.primaryContact') : idx === 1 ? t('admin.orders.secondaryContact') : t('admin.orders.backupContact')} ({cm.type}):
                          </span>
                          <span className="font-bold text-purple-600 dark:text-purple-300 select-all">
                            {cm.type === 'Phone' || cm.type === 'Viber' ? (
                              <a href={`tel:${cm.value}`} className="hover:underline">{cm.value}</a>
                            ) : cm.type === 'Email' ? (
                              <a href={`mailto:${cm.value}`} className="hover:underline">{cm.value}</a>
                            ) : (
                              cm.value
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* PAYMENT RECEIPT SECTION */}
              {(inspectTarget.payment || inspectTarget.receiptImagePath || inspectTarget.paymentSource || inspectTarget.isPayment) && (
                <div className="rounded-lg border border-black/10 bg-neutral-50 p-3.5 dark:border-white/10 dark:bg-neutral-800/50 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    {t('admin.orders.paymentProof')}
                  </h4>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold">
                        {t('admin.orders.paymentMethod')}: {inspectTarget.paymentSource === 'wallet' ? t('admin.orders.walletDebit') : inspectTarget.payment?.adminWalletAccount || inspectTarget.adminWalletAccount || 'Manual KBZPay / WavePay'}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {t('admin.orders.amount')}: <strong className="text-emerald-600">{formatCurrency(inspectTarget.payment?.amountMmk || inspectTarget.totalMmk || inspectTarget.amountMmk)}</strong>
                        {inspectTarget.totalUsd > 0 && (
                          <span className="ml-2 font-mono text-neutral-400">
                            (${inspectTarget.totalUsd.toFixed(2)} USD @ {inspectTarget.exchangeRateUsed || 4500} MMK/USD)
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Screenshot Preview */}
                    {(receiptUrlMap[inspectTarget.id] || (inspectTarget.payment && receiptUrlMap[inspectTarget.payment.id])) && (
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            openZoomModal(
                              receiptUrlMap[inspectTarget.id] || receiptUrlMap[inspectTarget.payment?.id],
                            )
                          }
                          className="group relative grid h-16 w-16 cursor-pointer place-items-center overflow-hidden rounded-lg border border-black/10 bg-black/5 dark:border-white/10"
                        >
                          <img
                            src={receiptUrlMap[inspectTarget.id] || receiptUrlMap[inspectTarget.payment?.id]}
                            alt="Receipt"
                            className="h-full w-full object-cover transition group-hover:scale-110"
                          />
                          <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100 text-white">
                            <Maximize2 className="h-4 w-4" />
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            downloadReceipt(
                              inspectTarget.receiptImagePath || inspectTarget.payment?.receiptImagePath,
                              `receipt-${inspectTarget.id}.png`,
                            )
                          }
                          className="cursor-pointer flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300"
                        >
                          <Download className="h-3.5 w-3.5" /> {t('admin.orders.download')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* APPROVE / REJECT ACTIONS FOR UNREVIEWED MANUAL PAYMENTS OR WALLET TOPUPS */}
                  {!isTargetFinalized && (inspectTarget.payment?.status === 'submitted' || inspectTarget.status === 'submitted' || inspectTarget.status === 'reviewing') && (
                    <div className="mt-3 flex items-center gap-2.5 border-t border-black/10 pt-2.5 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => handleReviewPayment(inspectTarget.payment || inspectTarget, 'approved')}
                        className="cursor-pointer flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        <Check className="h-3.5 w-3.5" /> {t('admin.orders.approveDeposit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewPayment(inspectTarget.payment || inspectTarget, 'rejected')}
                        className="cursor-pointer flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700"
                      >
                        <X className="h-3.5 w-3.5" /> {t('admin.orders.rejectDeposit')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PURCHASED PRODUCTS RECEIPT BREAKDOWN */}
              {!inspectTarget.isPayment && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    {t('admin.orders.purchaseReceiptBreakdown')}
                  </h4>
                  <div className="divide-y divide-black/5 rounded-lg border border-black/10 bg-neutral-50 p-3 dark:divide-white/5 dark:border-white/10 dark:bg-neutral-800/50">
                    {inspectTarget.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1.5 text-xs">
                        <span className="font-semibold">
                          {item.name} {item.variantName ? `(${item.variantName})` : ''} × {item.quantity}
                        </span>
                        <span className="font-mono text-neutral-600 dark:text-neutral-400">
                          {formatCurrency((item.priceMmk || item.price) * item.quantity)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 font-bold text-xs sm:text-sm text-[#0b7e74]">
                      <span>{t('admin.orders.orderTotalPaid')}</span>
                      <span>{formatCurrency(inspectTarget.totalMmk)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* READ-ONLY SENT LICENSE KEYS FOR DELIVERED/REJECTED ORDERS */}
              {isTargetFinalized && !inspectTarget.isPayment && (
                inspectTarget.status === 'delivered' ? (
                  <div className="rounded-lg border border-[#0b7e74]/20 bg-[#0b7e74]/5 p-3.5 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-black/5 pb-1.5 dark:border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0b7e74] dark:text-[#67dccf] flex items-center gap-1">
                        <Lock className="h-3 w-3" /> {t('admin.orders.deliveredCredentials')}
                      </span>
                      {inspectTarget.isRevealed ? (
                        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {t('admin.orders.revealedByCustomer')}
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          {t('admin.orders.protectedHidden')}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap select-all">
                      {inspectTarget.deliveryMessage || t('admin.orders.noCredentials')}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-black/10 bg-neutral-50 p-3.5 dark:border-white/10 dark:bg-neutral-800/50 space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                      {t('admin.orders.rejectionReason')}
                    </h4>
                    <div className="rounded-lg border border-black/10 bg-white p-2.5 font-mono text-xs font-semibold whitespace-pre-line dark:border-white/10 dark:bg-neutral-900">
                      {inspectTarget.deliveryMessage || t('admin.orders.noDeliveryMsg')}
                    </div>
                  </div>
                )
              )}

              {/* SECURE DELIVERY ACTION FOR ACTIVE ORDERS */}
              {!isTargetFinalized && !inspectTarget.isPayment && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    {t('admin.orders.digitalLicense')}
                  </h4>

                  <textarea
                    rows={3}
                    placeholder={t('admin.orders.enterCredentialsPlaceholder')}
                    value={messages[inspectTarget.id] ?? inspectTarget.deliveryMessage ?? ''}
                    onChange={(e) =>
                      setMessages((prev) => ({ ...prev, [inspectTarget.id]: e.target.value }))
                    }
                    className="w-full rounded-lg border border-black/10 bg-neutral-50 p-2.5 text-xs font-mono outline-none transition focus:border-[#0b7e74] focus:ring-1 focus:ring-[#0b7e74]/20 dark:border-white/10 dark:bg-neutral-800"
                  />

                  {/* QUICK SNIPPETS */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase text-neutral-400">{t('admin.orders.snippets')}</span>
                    <button
                      type="button"
                      onClick={() => appendSnippet(inspectTarget.id, 'License Key: XXXX-XXXX-XXXX-XXXX')}
                      className="cursor-pointer rounded-md bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300"
                    >
                      {t('admin.orders.addLicenseKey')}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        appendSnippet(
                          inspectTarget.id,
                          'Account: user@example.com\nPassword: Pass1234!',
                        )
                      }
                      className="cursor-pointer rounded-md bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300"
                    >
                      {t('admin.orders.addAccountCreds')}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        appendSnippet(
                          inspectTarget.id,
                          'Thank you for purchasing from Toodleoo Store! Enjoy your product.',
                        )
                      }
                      className="cursor-pointer rounded-md bg-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300"
                    >
                      {t('admin.orders.addThankYou')}
                    </button>
                  </div>

                  {/* DELIVER BUTTON */}
                  <button
                    type="button"
                    onClick={() => handleDeliver(inspectTarget)}
                    className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0b7e74] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#09665e]"
                  >
                    <Send className="h-3.5 w-3.5" /> {t('admin.orders.sendProductDelivery')}
                  </button>
                </div>
              )}

              {/* WALLET ORDER REJECT & REFUND SECTION FOR ACTIVE ORDERS ONLY */}
              {!isTargetFinalized && !inspectTarget.isPayment && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3.5 space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                    <RotateCcw className="h-3.5 w-3.5" /> {t('admin.orders.rejectRefundTitle')}
                  </h4>
                  <input
                    type="text"
                    placeholder={t('admin.orders.rejectPlaceholder')}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full rounded-lg border border-red-500/20 bg-white p-2 text-xs font-medium outline-none dark:bg-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleRejectAndRefund(inspectTarget)}
                    className="cursor-pointer w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-red-700"
                  >
                    <XCircle className="h-3.5 w-3.5" /> {t('admin.orders.declineRefundBtn')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN ZOOM RECEIPT MODAL */}
      {receiptModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-xl bg-neutral-900 p-2">
            <button
              type="button"
              onClick={() => setReceiptModalUrl('')}
              className="cursor-pointer absolute right-3 top-3 z-10 rounded-lg bg-black/60 p-1.5 text-white hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={receiptModalUrl}
              alt="Zoom Receipt"
              className="max-h-[85vh] w-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title={t('admin.orders.deleteTitle')}
        description={t('admin.orders.deleteMsg')}
        confirmText={t('admin.orders.deleteRecord')}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  )
}
