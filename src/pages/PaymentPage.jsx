import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { createManualPayment, createOrderFromCart, getAdminWalletAccount } from '../services/storeService'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../utils/useAuth'
import { getLocalPendingOrderById, removeLocalPendingOrder } from '../utils/localOrders'

export function PaymentPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const purpose = params.get('purpose') || 'wallet_topup'
  const orderId = params.get('orderId')
  const presetAmount = Number(params.get('amount') || 0)
  const [walletAccount, setWalletAccount] = useState(null)
  const [amountMmk, setAmountMmk] = useState(presetAmount)
  const [receiptFile, setReceiptFile] = useState(null)
  const [status, setStatus] = useState('')

  const title = useMemo(
    () => (purpose === 'order_payment' ? 'Submit order payment' : 'Recharge wallet'),
    [purpose],
  )

  useEffect(() => {
    getAdminWalletAccount().then(setWalletAccount)
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('Processing order and uploading receipt...')

    try {
      let finalOrderId = orderId

      // If this is a local draft order, create real order in DB now that receipt is being submitted
      if (purpose === 'order_payment' && orderId && orderId.startsWith('draft-')) {
        const draftOrder = getLocalPendingOrderById(orderId)
        if (draftOrder && Array.isArray(draftOrder.items)) {
          finalOrderId = await createOrderFromCart({
            items: draftOrder.items,
            paymentSource: 'manual_payment',
            couponCode: draftOrder.couponCode || null,
            contactMethods: draftOrder.contactMethods || draftOrder.contact_methods || [],
          })
          removeLocalPendingOrder(orderId)
        }
      }

      await createManualPayment({
        amountMmk: Number(amountMmk),
        orderId: finalOrderId,
        purpose,
        receiptFile,
        user,
      })

      setTimeout(() => {
        if (purpose === 'order_payment') {
          navigate(`/order-success?orderId=${finalOrderId || ''}&method=manual&amount=${amountMmk}&type=order`)
        } else {
          navigate(`/order-success?method=manual&amount=${amountMmk}&type=wallet_topup`)
        }
      }, 900)
    } catch (err) {
      console.error('Error submitting payment:', err)
      setStatus(err.message || 'Failed to submit payment.')
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
      <aside className="rounded-lg border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <p className="font-bold text-[#0b7e74]">Manual transfer</p>
        <h1 className="mt-2 text-3xl font-black">{title}</h1>
        <div className="mt-6 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-950">
          <p className="text-sm font-bold text-neutral-500">Send payment to</p>
          <p className="mt-2 text-xl font-black">{walletAccount?.displayName || 'Admin wallet'}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(walletAccount?.phoneNumber || '')}
            className="mt-3 cursor-pointer rounded-full bg-neutral-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0b7e74] active:scale-[0.98] dark:bg-white dark:text-neutral-950 dark:hover:bg-[#0b7e74] dark:hover:text-white"
          >
            Copy {walletAccount?.phoneNumber || 'phone number'}
          </button>
        </div>
      </aside>
      <form onSubmit={handleSubmit} className="rounded-lg border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <label className="block text-sm font-bold">
          {purpose === 'order_payment' ? 'Order Amount' : 'Amount to Recharge'}
          <input
            type="number"
            min="1"
            value={amountMmk}
            onChange={(event) => setAmountMmk(event.target.value)}
            disabled={purpose === 'order_payment'}
            readOnly={purpose === 'order_payment'}
            className={`mt-2 w-full rounded-lg border border-black/10 px-3 py-3 dark:border-white/10 dark:bg-neutral-950 ${purpose === 'order_payment'
                ? 'cursor-not-allowed bg-neutral-100 opacity-75 dark:bg-neutral-900'
                : ''
              }`}
            required
          />
        </label>
        <p className="mt-2 text-sm font-bold text-[#0b7e74]">{formatCurrency(amountMmk)}</p>
        <label className="mt-5 block text-sm font-bold">
          Receipt screenshot
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setReceiptFile(event.target.files?.[0])}
            className="mt-2 w-full rounded-lg border border-black/10 px-3 py-3 dark:border-white/10 dark:bg-neutral-950 cursor-pointer"
            required
          />
        </label>
        <button className="mt-6 cursor-pointer rounded-full bg-gradient-to-r from-[#0fa697] to-[#ff655b] px-6 py-3 font-black text-white shadow-md transition hover:opacity-90 hover:shadow-lg active:scale-[0.98]">
          Submit receipt
        </button>
        {status && <p className="mt-4 text-sm font-bold text-[#0b7e74]">{status}</p>}
      </form>
    </section>
  )
}
