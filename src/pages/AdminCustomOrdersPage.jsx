import { useEffect, useMemo, useState } from 'react'
import {
  subscribeAdminCollection,
  quoteCustomOrder,
  rejectCustomOrder,
  deliverCustomOrder,
  deleteCustomOrder,
  getReceiptUrl,
} from '../services/storeService'
import {
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Send,
  Trash2,
  Eye,
  X,
  ExternalLink,
  Shield,
  FileText,
  User,
  Zap,
} from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { useTranslation } from '../utils/useTranslation'
import { DeleteConfirmModal } from '../components/common/DeleteConfirmModal'

export function AdminCustomOrdersPage() {
  const { t } = useTranslation()
  const [customOrders, setCustomOrders] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'pending_quote', 'quoted', 'paid', 'delivered', 'rejected'
  
  // Modal states
  const [quoteTarget, setQuoteTarget] = useState(null)
  const [quotePriceMmk, setQuotePriceMmk] = useState('')
  const [quotePriceUsd, setQuotePriceUsd] = useState('')
  const [quoteNotes, setQuoteNotes] = useState('')
  const [isQuoting, setIsQuoting] = useState(false)

  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isRejecting, setIsRejecting] = useState(false)

  const [deliverTarget, setDeliverTarget] = useState(null)
  const [deliveryMessage, setDeliveryMessage] = useState('')
  const [isDelivering, setIsDelivering] = useState(false)

  const [inspectTarget, setInspectTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [receiptUrl, setReceiptUrl] = useState('')

  useEffect(() => {
    return subscribeAdminCollection('custom_orders', setCustomOrders)
  }, [])

  // Load receipt URL when inspecting
  useEffect(() => {
    async function loadReceipt() {
      if (inspectTarget?.receiptImagePath) {
        const url = await getReceiptUrl(inspectTarget.receiptImagePath)
        setReceiptUrl(url)
      } else {
        setReceiptUrl('')
      }
    }
    loadReceipt()
  }, [inspectTarget])

  // Count by status
  const counts = useMemo(() => {
    const res = {
      pending: 0,
      quoted: 0,
      processing: 0,
      delivered: 0,
      rejected: 0,
    }
    customOrders.forEach((o) => {
      if (o.status === 'pending_quote') res.pending++
      else if (o.status === 'quoted') res.quoted++
      else if (o.status === 'paid' || o.status === 'submitted') res.processing++
      else if (o.status === 'delivered') res.delivered++
      else if (o.status === 'rejected' || o.status === 'cancelled') res.rejected++
    })
    return res
  }, [customOrders])

  const filteredOrders = useMemo(() => {
    return customOrders.filter((order) => {
      const q = search.trim().toLowerCase()
      const matchesSearch =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.productName?.toLowerCase().includes(q) ||
        order.providerName?.toLowerCase().includes(q) ||
        order.userEmail?.toLowerCase().includes(q)

      let matchesStatus = true
      if (statusFilter === 'pending_quote') matchesStatus = order.status === 'pending_quote'
      else if (statusFilter === 'quoted') matchesStatus = order.status === 'quoted'
      else if (statusFilter === 'paid') matchesStatus = order.status === 'paid' || order.status === 'submitted'
      else if (statusFilter === 'delivered') matchesStatus = order.status === 'delivered'
      else if (statusFilter === 'rejected') matchesStatus = order.status === 'rejected' || order.status === 'cancelled'

      return matchesSearch && matchesStatus
    })
  }, [customOrders, search, statusFilter])

  // Handle Quote Submit
  async function handleQuoteSubmit(e) {
    e.preventDefault()
    if (!quoteTarget || !quotePriceMmk) return
    setIsQuoting(true)
    try {
      const updated = await quoteCustomOrder({
        id: quoteTarget.id,
        priceMmk: Number(quotePriceMmk),
        priceUsd: quotePriceUsd ? Number(quotePriceUsd) : null,
        adminNotes: quoteNotes,
      })
      if (updated) {
        setCustomOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
      }
      setQuoteTarget(null)
      setQuotePriceMmk('')
      setQuotePriceUsd('')
      setQuoteNotes('')
    } catch (err) {
      alert(`Failed to submit quote: ${err.message}`)
    } finally {
      setIsQuoting(false)
    }
  }

  // Handle Reject Submit
  async function handleRejectSubmit(e) {
    e.preventDefault()
    if (!rejectTarget) return
    setIsRejecting(true)
    try {
      const updated = await rejectCustomOrder({
        id: rejectTarget.id,
        reason: rejectReason,
      })
      if (updated) {
        setCustomOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
      }
      setRejectTarget(null)
      setRejectReason('')
    } catch (err) {
      alert(`Failed to reject request: ${err.message}`)
    } finally {
      setIsRejecting(false)
    }
  }

  // Handle Deliver Submit
  async function handleDeliverSubmit(e) {
    e.preventDefault()
    if (!deliverTarget || !deliveryMessage.trim()) return
    setIsDelivering(true)
    try {
      const updated = await deliverCustomOrder({
        customOrderId: deliverTarget.id,
        deliveryMessage: deliveryMessage.trim(),
      })
      if (updated) {
        setCustomOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
      }
      setDeliverTarget(null)
      setDeliveryMessage('')
    } catch (err) {
      alert(`Failed to deliver custom order: ${err.message}`)
    } finally {
      setIsDelivering(false)
    }
  }

  // Handle Delete Order
  async function handleDeleteOrder() {
    if (!deleteTarget) return
    const targetId = deleteTarget.id
    setIsDeleting(true)
    try {
      await deleteCustomOrder(targetId)
      setCustomOrders((prev) => prev.filter((o) => o.id !== targetId))
      setDeleteTarget(null)
    } catch (err) {
      alert(`Failed to delete custom order: ${err.message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'pending_quote':
        return {
          label: t('admin.custom.needsQuote'),
          bg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
          dot: 'bg-amber-500',
        }
      case 'quoted':
        return {
          label: t('admin.custom.quoted'),
          bg: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
          dot: 'bg-blue-500',
        }
      case 'submitted':
        return {
          label: t('admin.orders.reviewing'),
          bg: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
          dot: 'bg-purple-500',
        }
      case 'paid':
        return {
          label: t('admin.custom.paidProcessing'),
          bg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
          dot: 'bg-emerald-500',
        }
      case 'delivered':
        return {
          label: t('admin.custom.delivered'),
          bg: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
          dot: 'bg-green-500',
        }
      case 'rejected':
        return {
          label: t('admin.custom.declinedTab'),
          bg: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
          dot: 'bg-rose-500',
        }
      case 'cancelled':
        return {
          label: t('admin.custom.declinedCancelled'),
          bg: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
          dot: 'bg-neutral-400',
        }
      default:
        return {
          label: status,
          bg: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
          dot: 'bg-neutral-400',
        }
    }
  }

  return (
    <section className="space-y-6">
      {/* HEADER STATS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-lg border border-black/10 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t('admin.custom.needsQuote')}</p>
          <p className="mt-1 text-2xl font-black text-amber-500">{counts.pending}</p>
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t('admin.custom.quoted')}</p>
          <p className="mt-1 text-2xl font-black text-blue-500">{counts.quoted}</p>
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t('admin.custom.paidProcessing')}</p>
          <p className="mt-1 text-2xl font-black text-emerald-500">{counts.processing}</p>
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t('admin.custom.delivered')}</p>
          <p className="mt-1 text-2xl font-black text-green-500">{counts.delivered}</p>
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-3.5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t('admin.custom.declinedCancelled')}</p>
          <p className="mt-1 text-2xl font-black text-rose-500">{counts.rejected}</p>
        </div>
      </div>

      {/* CONTROLS: SEARCH + FILTER TABS */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder={t('admin.custom.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-white pl-9 pr-4 py-2 text-xs font-semibold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-nowrap rounded-lg border border-black/10 bg-neutral-100 p-1 dark:border-white/10 dark:bg-neutral-800">
          {[
            { id: 'all', label: t('admin.custom.allRequests') },
            { id: 'pending_quote', label: t('admin.custom.pendingQuoteTab', { count: counts.pending }) },
            { id: 'quoted', label: t('admin.custom.quotedTab', { count: counts.quoted }) },
            { id: 'paid', label: t('admin.custom.paidReadyTab', { count: counts.processing }) },
            { id: 'delivered', label: t('admin.custom.deliveredTab') },
            { id: 'rejected', label: t('admin.custom.declinedTab') },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-white text-black shadow-sm dark:bg-neutral-900 dark:text-white'
                  : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-700/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CUSTOM ORDERS TABLE */}
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900">
        {filteredOrders.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">
            <Package className="mx-auto h-8 w-8 text-neutral-400" />
            <p className="mt-2 text-sm font-bold">{t('admin.custom.noRequests')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-black/10 bg-neutral-50 font-bold uppercase tracking-wider text-neutral-500 dark:border-white/10 dark:bg-neutral-800/50">
                <tr>
                  <th className="p-2.5">{t('admin.custom.requestRef')}</th>
                  <th className="p-2.5">{t('admin.custom.customerUser')}</th>
                  <th className="p-2.5">{t('admin.custom.requestedProduct')}</th>
                  <th className="p-2.5">{t('admin.productsTab.classification')}</th>
                  <th className="p-2.5">{t('admin.custom.priceQuote')}</th>
                  <th className="p-2.5 text-right">{t('admin.custom.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredOrders.map((order) => {
                  const badge = getStatusBadge(order.status)
                  const isAccountType = order.orderType === 'Account' || order.orderType === 'Direct Top-up'
                  const hasAccountInfo = order.accountInfo && Object.keys(order.accountInfo).length > 0

                  return (
                    <tr key={order.id} className="transition hover:bg-black/5 dark:hover:bg-white/5">
                      {/* ID & DATE */}
                      <td className="p-2.5 font-mono">
                        <div className="font-bold text-black dark:text-white">#{order.id.slice(0, 8)}</div>
                        <div className="text-[10px] text-neutral-400">
                          {new Date(order.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* CUSTOMER */}
                      <td className="p-2.5">
                        <div className="font-bold text-black dark:text-white">{order.userEmail}</div>
                        {Array.isArray(order.contactMethods) && order.contactMethods.length > 0 && (
                          <div className="text-[10px] text-[#0b7e74] dark:text-[#67dccf]">
                            {order.contactMethods[0].type}: {order.contactMethods[0].value}
                          </div>
                        )}
                      </td>

                      {/* PRODUCT & PROVIDER */}
                      <td className="p-2.5">
                        <div className="font-bold text-xs sm:text-sm text-black dark:text-white">{order.productName}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                          <span>{order.providerName}</span>
                          {order.productUrl && (
                            <a
                              href={order.productUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#0b7e74] hover:underline flex items-center gap-0.5"
                            >
                              <ExternalLink className="h-3 w-3" /> Link
                            </a>
                          )}
                        </div>
                      </td>

                      {/* TYPE & REGION */}
                      <td className="p-2.5">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded-md bg-[#0b7e74]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#0b7e74] dark:bg-[#0b7e74]/20 dark:text-[#67dccf]">
                            {order.orderType}
                          </span>
                          <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            {order.targetRegion || 'Global'}
                          </span>
                        </div>
                        {isAccountType && hasAccountInfo && (
                          <div className="mt-1 text-[10px] text-amber-600 font-bold flex items-center gap-1">
                            <Shield className="h-3 w-3" /> Credentials provided
                          </div>
                        )}
                      </td>

                      {/* STATUS & PRICE */}
                      <td className="p-2.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          {badge.label}
                        </span>

                        {order.quotedPriceMmk && (
                          <div className="mt-1 font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(order.quotedPriceMmk)}
                            {order.quotedPriceUsd && (
                              <span className="ml-1 text-[10px] font-normal text-neutral-400">
                                (${order.quotedPriceUsd})
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* INSPECT DETAILS */}
                          <button
                            type="button"
                            onClick={() => setInspectTarget(order)}
                            className="rounded-lg border border-black/10 p-1.5 text-neutral-600 hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-neutral-800 cursor-pointer"
                            title={t('admin.custom.inspect')}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* PENDING QUOTE -> QUOTE PRICE */}
                          {order.status === 'pending_quote' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuoteTarget(order)
                                  setQuotePriceMmk(order.quotedPriceMmk || '')
                                  setQuotePriceUsd(order.quotedPriceUsd || '')
                                  setQuoteNotes(order.adminNotes || '')
                                }}
                                className="rounded-lg bg-[#0b7e74] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-[#096860] cursor-pointer"
                              >
                                {t('admin.custom.quotePrice')}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRejectTarget(order)
                                  setRejectReason('')
                                }}
                                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-500/20 cursor-pointer dark:text-rose-400"
                              >
                                {t('admin.custom.decline')}
                              </button>
                            </>
                          )}

                          {/* QUOTED -> EDIT QUOTE */}
                          {order.status === 'quoted' && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuoteTarget(order)
                                setQuotePriceMmk(order.quotedPriceMmk || '')
                                setQuotePriceUsd(order.quotedPriceUsd || '')
                                setQuoteNotes(order.adminNotes || '')
                              }}
                              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-500/20 cursor-pointer dark:text-blue-400"
                            >
                              {t('admin.custom.quotePrice')}
                            </button>
                          )}

                          {/* PAID / SUBMITTED -> DELIVER */}
                          {(order.status === 'paid' || order.status === 'submitted') && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeliverTarget(order)
                                setDeliveryMessage(order.deliveryMessage || '')
                              }}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
                            >
                              <Send className="h-3 w-3" /> {t('admin.custom.deliverKey')}
                            </button>
                          )}

                          {/* DELETE */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(order)}
                            className="rounded-lg p-1.5 text-neutral-400 hover:bg-rose-500/10 hover:text-rose-600 cursor-pointer"
                            title={t('admin.custom.delete')}
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

      {/* MODAL 1: SET / EDIT QUOTE */}
      {quoteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-black/10 pb-3 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#0b7e74]" />
                <h3 className="font-bold text-base sm:text-lg">{t('admin.custom.quoteModalTitle')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuoteTarget(null)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQuoteSubmit} className="mt-4 space-y-3.5">
              <div className="rounded-lg bg-neutral-50 p-2.5 text-xs dark:bg-neutral-950">
                <p className="font-bold text-neutral-900 dark:text-white">{quoteTarget.productName}</p>
                <p className="text-neutral-500 text-[11px]">Provider: {quoteTarget.providerName} • Type: {quoteTarget.orderType}</p>
                {quoteTarget.notes && (
                  <p className="mt-1 text-neutral-600 dark:text-neutral-300 italic text-[11px]">"{quoteTarget.notes}"</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  {t('admin.custom.quotedPriceMmk')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 25000"
                  value={quotePriceMmk}
                  onChange={(e) => setQuotePriceMmk(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  {t('admin.custom.quotedPriceUsd')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 5.50"
                  value={quotePriceUsd}
                  onChange={(e) => setQuotePriceUsd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  {t('admin.custom.adminNotes')}
                </label>
                <textarea
                  rows={3}
                  placeholder={t('admin.custom.adminNotesPlaceholder')}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2 text-xs font-medium outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuoteTarget(null)}
                  className="rounded-lg px-3.5 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isQuoting || !quotePriceMmk}
                  className="rounded-lg bg-[#0b7e74] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#096860] disabled:opacity-50 cursor-pointer"
                >
                  {isQuoting ? '...' : t('admin.custom.submitQuote')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DECLINE REQUEST */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-black/10 pb-3 dark:border-white/10">
              <h3 className="font-bold text-base sm:text-lg text-rose-600">{t('admin.custom.declineModalTitle')}</h3>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  {t('admin.custom.declineReason')}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={t('admin.custom.declinePlaceholder')}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2 text-xs font-medium outline-none transition focus:border-rose-500 dark:border-white/10 dark:bg-neutral-950"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="rounded-lg px-3.5 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isRejecting || !rejectReason.trim()}
                  className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  {isRejecting ? '...' : t('admin.custom.confirmDecline')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FULFILL & DELIVER MODAL */}
      {deliverTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-black/10 pb-3 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-emerald-600" />
                <h3 className="font-bold text-base sm:text-lg">{t('admin.custom.deliverModalTitle')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeliverTarget(null)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDeliverSubmit} className="mt-4 space-y-3.5">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs dark:bg-emerald-500/5">
                <p className="font-bold text-emerald-800 dark:text-emerald-300">{deliverTarget.productName}</p>
                <p className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                  Customer: {deliverTarget.userEmail} • Paid: {formatCurrency(deliverTarget.quotedPriceMmk)}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                  {t('admin.orders.digitalLicense')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={t('admin.custom.deliverMessagePlaceholder')}
                  value={deliveryMessage}
                  onChange={(e) => setDeliveryMessage(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2.5 text-xs font-mono outline-none transition focus:border-emerald-500 dark:border-white/10 dark:bg-neutral-950"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeliverTarget(null)}
                  className="rounded-lg px-3.5 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isDelivering || !deliveryMessage.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="h-3 w-3" />
                  {isDelivering ? '...' : t('admin.custom.sendDelivery')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: INSPECT FULL DETAILS */}
      {inspectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-black/10 pb-3 dark:border-white/10">
              <h3 className="font-bold text-base sm:text-lg">Custom Order #{inspectTarget.id.slice(0, 8)}</h3>
              <button
                type="button"
                onClick={() => setInspectTarget(null)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950">
                <div>
                  <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Product</span>
                  <p className="font-bold text-xs sm:text-sm text-black dark:text-white mt-0.5">{inspectTarget.productName}</p>
                </div>
                <div>
                  <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Provider / Store</span>
                  <p className="font-bold text-xs sm:text-sm text-black dark:text-white mt-0.5">{inspectTarget.providerName}</p>
                </div>
                <div>
                  <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Order Type</span>
                  <p className="font-bold text-black dark:text-white mt-0.5">{inspectTarget.orderType}</p>
                </div>
                <div>
                  <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Target Region</span>
                  <p className="font-bold text-black dark:text-white mt-0.5">{inspectTarget.targetRegion || 'Global'}</p>
                </div>
              </div>

              {/* ACCOUNT CREDENTIALS (IF PROVIDED) */}
              {inspectTarget.accountInfo && Object.keys(inspectTarget.accountInfo).length > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 mb-1.5">
                    <Shield className="h-3.5 w-3.5" /> Customer Account Credentials
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    {Object.entries(inspectTarget.accountInfo).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-black/5 pb-1 dark:border-white/5">
                        <span className="text-neutral-500 capitalize">{k.replace('_', ' ')}:</span>
                        <span className="font-bold text-black dark:text-white select-all">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NOTES */}
              {inspectTarget.notes && (
                <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950">
                  <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Customer Notes</span>
                  <p className="mt-1 text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{inspectTarget.notes}</p>
                </div>
              )}

              {/* QUOTE & PAYMENT */}
              <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-950 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-neutral-400">Status</span>
                  <span className="font-bold text-black dark:text-white uppercase">{inspectTarget.status}</span>
                </div>
                {inspectTarget.quotedPriceMmk && (
                  <div className="flex justify-between items-center font-mono">
                    <span className="font-bold text-neutral-400">Quoted Price</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                      {formatCurrency(inspectTarget.quotedPriceMmk)}
                    </span>
                  </div>
                )}
                {inspectTarget.paymentSource && (
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-neutral-400">Payment Method</span>
                    <span className="font-bold capitalize">{inspectTarget.paymentSource.replace('_', ' ')}</span>
                  </div>
                )}
              </div>

              {/* RECEIPT IMAGE (IF MANUAL) */}
              {receiptUrl && (
                <div>
                  <span className="font-bold text-neutral-400 uppercase tracking-wider text-[10px]">Payment Receipt</span>
                  <div className="mt-1 overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
                    <img src={receiptUrl} alt="Transfer Receipt" className="w-full object-contain max-h-60" />
                  </div>
                </div>
              )}

              {/* DELIVERY MESSAGE (IF DELIVERED) */}
              {inspectTarget.deliveryMessage && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[10px]">Delivered Credentials / Message</span>
                  <p className="mt-1 font-mono text-xs text-black dark:text-white whitespace-pre-wrap select-all">
                    {inspectTarget.deliveryMessage}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectTarget(null)}
                className="rounded-lg bg-neutral-950 px-4 py-1.5 text-xs font-bold text-white hover:bg-neutral-800 dark:bg-white dark:text-black cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteOrder}
        title={t('admin.custom.deleteTitle')}
        description={t('admin.custom.deleteMsg', { name: deleteTarget?.productName || '' })}
        loading={isDeleting}
      />
    </section>
  )
}
