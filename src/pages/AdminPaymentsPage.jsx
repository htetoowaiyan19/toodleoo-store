import { useEffect, useState } from 'react'
import {
  getReceiptUrl,
  reviewPayment,
  subscribeAdminCollection,
} from '../services/storeService'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../utils/useAuth'

export function AdminPaymentsPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [receiptUrls, setReceiptUrls] = useState({})
  const [reviewNote, setReviewNote] = useState('')

  useEffect(() => subscribeAdminCollection('payments', setPayments), [])

  async function handleReview(payment, status) {
    await reviewPayment({ admin: user, payment, reviewNote, status })
    setReviewNote('')
  }

  async function openReceipt(payment) {
    const url = receiptUrls[payment.id] || (await getReceiptUrl(payment.receiptImagePath))
    setReceiptUrls((current) => ({ ...current, [payment.id]: url }))
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="font-bold text-[#0b7e74]">Admin</p>
      <h1 className="mt-2 text-4xl font-black">Payment review</h1>
      <div className="mt-8 space-y-4">
        {payments.map((payment) => (
          <article key={payment.id} className="rounded-lg border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
            <div className="flex flex-col justify-between gap-4 lg:flex-row">
              <div>
                <p className="text-xl font-black">{formatCurrency(payment.amountMmk)} / {payment.status}</p>
                <p className="mt-1 text-sm text-neutral-500">{payment.userEmail} / {payment.purpose}</p>
                {payment.receiptImagePath && (
                  <button type="button" onClick={() => openReceipt(payment)} className="mt-3 inline-block font-bold text-[#0b7e74]">
                    Open receipt
                  </button>
                )}
              </div>
              {payment.status === 'submitted' && (
                <div className="min-w-72">
                  <input
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="Review note"
                    className="w-full rounded-lg border border-black/10 px-3 py-3 dark:border-white/10 dark:bg-neutral-950"
                  />
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleReview(payment, 'approved')} className="rounded-full bg-[#0fa697] px-4 py-2 font-bold text-white">
                      Approve
                    </button>
                    <button onClick={() => handleReview(payment, 'rejected')} className="rounded-full bg-[#ff655b] px-4 py-2 font-bold text-white">
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
