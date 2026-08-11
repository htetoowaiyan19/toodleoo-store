import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  CheckCircle2,
  Clock,
  CreditCard,
  ChevronRight,
  FileText,
  Package,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../utils/useAuth'
import { cancelPendingOrder, subscribeUserCollection } from '../services/storeService'
import { getLocalPendingOrders, removeLocalPendingOrder } from '../utils/localOrders'
import { DeleteConfirmModal } from '../components/common/DeleteConfirmModal'

export function OrdersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [localDrafts, setLocalDrafts] = useState(() => getLocalPendingOrders())
  const [search, setSearch] = useState('')
  const [deletingOrderTarget, setDeletingOrderTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => subscribeUserCollection('orders', user.id, setOrders), [user.id])

  const combinedOrders = useMemo(() => {
    const remoteIds = new Set(orders.map((o) => o.id))
    const activeDrafts = localDrafts.filter((o) => !remoteIds.has(o.id))
    return [...activeDrafts, ...orders].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    )
  }, [orders, localDrafts])

  const filteredOrders = combinedOrders.filter((order) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      order.id.toLowerCase().includes(q) ||
      (order.items && order.items.some((i) => i.name.toLowerCase().includes(q)))
    )
  })

  async function handleConfirmDelete() {
    if (!deletingOrderTarget) return
    setIsDeleting(true)
    try {
      if (deletingOrderTarget.isLocalDraft || deletingOrderTarget.id.startsWith('draft-')) {
        removeLocalPendingOrder(deletingOrderTarget.id)
        setLocalDrafts(getLocalPendingOrders())
      } else {
        await cancelPendingOrder(deletingOrderTarget.id)
      }
    } catch (err) {
      console.error('Error cancelling order:', err)
    } finally {
      setIsDeleting(false)
      setDeletingOrderTarget(null)
    }
  }



  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
      {/* HEADER TITLE */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-bold text-[#0b7e74]">Customer Dashboard</p>
          <h1 className="mt-1 text-3xl font-black">My Order History</h1>
          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
            View your permanent order history and click any order to view details or reveal delivery codes.
          </p>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search order ID or product name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-black/10 bg-white pl-10 pr-4 py-2.5 text-xs font-medium outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
        />
      </div>

      {/* COMPACT ORDERS TABLE */}
      <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <Package className="mx-auto h-8 w-8 text-neutral-400" />
            <p className="mt-2 text-sm font-bold">No orders found</p>
            <Link to="/store" className="mt-4 inline-block text-xs font-bold text-[#0b7e74]">
              Browse Products →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-black/10 bg-neutral-50 font-bold uppercase tracking-wider text-neutral-500 dark:border-white/10 dark:bg-neutral-800/50">
                <tr>
                  <th className="p-3">Order Ref</th>
                  <th className="p-3">Items Purchased</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Payment Source</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Order Date</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredOrders.map((order) => {
                  const isPending = order.status === 'pending_payment' || !order.isSubmitted
                  const orderDate = order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString()
                    : 'N/A'

                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="cursor-pointer transition hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      {/* ORDER REF */}
                      <td className="p-3 font-mono font-black text-[#0b7e74]">
                        <span className="bg-[#0b7e74]/10 px-2 py-1 rounded-xl">
                          #{order.id.slice(0, 8)}
                        </span>
                      </td>

                      {/* ITEMS */}
                      <td className="p-3 font-semibold text-neutral-800 dark:text-neutral-200 max-w-xs truncate">
                        {order.items?.map((it) => `${it.name} × ${it.quantity}`).join(', ') ||
                          'Digital Product'}
                      </td>

                      {/* TOTAL AMOUNT */}
                      <td className="p-3 font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(order.totalMmk)}
                      </td>

                      {/* PAYMENT SOURCE */}
                      <td className="p-3">
                        {order.paymentSource === 'wallet' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            <CreditCard className="h-3 w-3" /> Wallet Pay
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <FileText className="h-3 w-3" /> Manual Transfer
                          </span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="p-3">
                        {order.status === 'delivered' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Delivered
                          </span>
                        ) : order.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            <Clock className="h-3 w-3" /> Paid & Processing
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-[10px] font-bold text-rose-500">
                            <Clock className="h-3 w-3" /> Pending Payment
                          </span>
                        ) : order.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-500">
                            <XCircle className="h-3 w-3" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <Clock className="h-3 w-3" /> Reviewing
                          </span>
                        )}
                      </td>

                      {/* DATE */}
                      <td className="p-3 text-neutral-500 font-medium">{orderDate}</td>

                      {/* ACTION */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0b7e74] hover:underline">
                            View <ChevronRight className="h-3.5 w-3.5" />
                          </span>

                          {(isPending || order.isLocalDraft || order.id.startsWith('draft-')) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeletingOrderTarget(order)
                              }}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-500 hover:bg-rose-500 hover:text-white transition cursor-pointer"
                              title="Cancel and delete pending order"
                            >
                              <Trash2 className="h-3 w-3" /> Cancel
                            </button>
                          )}
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

      {/* 5-SECOND COUNTDOWN DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingOrderTarget)}
        onClose={() => setDeletingOrderTarget(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        title="Cancel & Delete Order?"
        message={`Are you sure you want to cancel order ${
          deletingOrderTarget ? '#' + deletingOrderTarget.id.slice(0, 8) : ''
        }? This pending order will be permanently deleted.`}
      />
    </section>
  )
}

