import { useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { useCart } from '../utils/useCart'
import { useCoupon } from '../utils/couponContext'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../utils/useAuth'
import { useProducts } from '../utils/useProducts'
import { createOrderFromCart } from '../services/storeService'
import { ContactMethodsEditor, calculateContactFeePercent } from '../components/account/ContactMethodsEditor'
import { Tag, X, FileText, CheckCircle2 } from 'lucide-react'

import { saveLocalPendingOrder } from '../utils/localOrders'

export function CheckoutPage() {


  const location = useLocation()
  const { clearCart, items: cartItems } = useCart()
  const { appliedCoupon, couponDiscountMmk, applyCoupon, removeCoupon } = useCoupon()
  const { profile, refreshProfile, updateProfile } = useAuth()
  const navigate = useNavigate()

  const directItemRaw = location.state?.directItem

  // Contact priorities state initialized from user profile
  const [contactMethods, setContactMethods] = useState(() => {
    if (Array.isArray(profile?.contactMethods) && profile.contactMethods.length > 0) {
      return profile.contactMethods
    }
    return [{ priority: 1, type: 'Email', value: profile?.email || '' }]
  })

  // If directItem is passed via navigation, process single item checkout without touching cart
  const checkoutItems = directItemRaw
    ? [
      (() => {
        const prod = directItemRaw.product
        const activeVar = directItemRaw.selectedVariant || prod.items?.[0] || null
        const itemId = activeVar?.id || prod.itemId || prod.id
        const priceMmk = Number(activeVar?.priceMmk !== undefined ? activeVar.priceMmk : prod.priceMmk || prod.price || 0)
        return {
          ...prod,
          id: itemId,
          itemId,
          productId: prod.id,
          cartItemId: `direct-${itemId}`,
          selectedVariant: activeVar ? { id: activeVar.id, name: activeVar.name, priceMmk } : null,
          variantName: activeVar?.name || '',
          priceMmk,
          price: priceMmk,
          basePriceMmk: priceMmk,
          quantity: directItemRaw.quantity || 1,
          requiredFields: prod.requiredFields || activeVar?.requiredFields || [],
        }
      })(),
    ]
    : cartItems

  const subtotal = checkoutItems.reduce(
    (total, item) => total + (item.priceMmk || item.price || 0) * item.quantity,
    0,
  )

  const [inputCode, setInputCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [customerInputs, setCustomerInputs] = useState({})

  const requiredFieldList = useMemo(() => {
    const list = []
    const seenLabels = new Set()

    const addField = (itemObj) => {
      if (itemObj && itemObj.label && !seenLabels.has(itemObj.label)) {
        seenLabels.add(itemObj.label)
        list.push(itemObj)
      }
    }

    checkoutItems.forEach((item) => {
      const fields = Array.isArray(item.requiredFields) ? item.requiredFields : []
      fields.forEach((rf) => {
        const fieldId = typeof rf === 'string' ? rf : rf.id
        const fieldLabel = typeof rf === 'string' ? rf : rf.label || rf.id

        if (fieldId === 'account_info' || fieldId === 'account_login' || fieldLabel?.includes('Account Info')) {
          addField({
            id: 'account_login',
            label: 'Account Username or Email',
            placeholder: 'Enter account username or email...',
            type: 'text',
          })
          addField({
            id: 'account_password',
            label: 'Account Password',
            placeholder: 'Enter account password...',
            type: 'password',
          })
        } else if (fieldId === 'uid_info') {
          addField({
            id: 'uid_info',
            label: 'Game UID / Player ID',
            placeholder: 'Enter Game UID / Player ID (e.g. 12345678)...',
            type: 'text',
          })
        } else if (fieldId === 'email_info') {
          addField({
            id: 'email_info',
            label: 'Account Email Address',
            placeholder: 'Enter account email address...',
            type: 'email',
          })
        } else if (fieldId === 'name_info') {
          addField({
            id: 'name_info',
            label: 'In-Game Name / Display Name',
            placeholder: 'Enter in-game character name...',
            type: 'text',
          })
        } else {
          addField({
            id: fieldId,
            label: fieldLabel,
            placeholder: `Enter ${fieldLabel}...`,
            type: fieldId?.includes('password') ? 'password' : 'text',
          })
        }
      })
    })

    return list
  }, [checkoutItems])


  const { taxPercent = 0, serviceFeePercent = 0 } = useProducts()

  const contactFeePercent = calculateContactFeePercent(contactMethods)
  const baseTotal = Math.max(0, subtotal - couponDiscountMmk)
  const contactFeeMmk = contactFeePercent > 0 ? Math.round(baseTotal * (contactFeePercent / 100)) : 0
  const finalTotal = baseTotal + contactFeeMmk

  const validContacts = Array.isArray(contactMethods)
    ? contactMethods.filter((cm) => cm.type && cm.value && cm.value.trim() !== '')
    : []
  const isContactValid = validContacts.length > 0

  async function handleSaveContacts(updatedMethods) {
    setContactMethods(updatedMethods)
    if (profile && updateProfile) {
      await updateProfile({ contact_methods: updatedMethods })
    }
  }

  async function handleApplyCoupon(e) {
    e.preventDefault()
    setCouponError('')
    setCouponLoading(true)
    const res = await applyCoupon(inputCode, checkoutItems)
    setCouponLoading(false)
    if (!res.success) {
      setCouponError(res.message)
    } else {
      setInputCode('')
    }
  }

  async function startCheckout(paymentSource) {
    setError('')

    // Validate mandatory contact requirement
    if (!isContactValid) {
      setError('At least 1 contact method is required to place an order so admins can connect with you.')
      return
    }

    // Validate required customer fields if any product specifies them
    for (const field of requiredFieldList) {
      if (!customerInputs[field.label] || !customerInputs[field.label].trim()) {
        setError(`Please fill in "${field.label}" before proceeding with payment.`)
        return
      }
    }

    setBusy(true)
    try {
      const itemsPayload = checkoutItems.map((it) => ({
        ...it,
        customerInputs: Object.keys(customerInputs).length > 0 ? customerInputs : it.customerInputs || null,
      }))

      if (paymentSource === 'manual_payment') {
        const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const draftOrder = {
          id: draftId,
          userId: profile?.id || user?.id || null,
          userEmail: profile?.email || user?.email || 'customer@toodleoo.store',
          items: itemsPayload,
          subtotal,
          couponDiscountMmk,
          contactFeePercent,
          contactFeeMmk,
          totalMmk: finalTotal,
          totalUsd: checkoutItems.reduce((acc, i) => acc + (i.priceUsd || 0) * i.quantity, 0),
          contactMethods: validContacts,
          contact_methods: validContacts,
          paymentSource: 'manual_payment',
          payment_source: 'manual_payment',
          status: 'pending_payment',
          isSubmitted: false,
          is_submitted: false,
          createdAt: new Date().toISOString(),
          customerInputs,
          isLocalDraft: true,
        }

        saveLocalPendingOrder(draftOrder)

        if (!directItemRaw) {
          clearCart()
        }
        removeCoupon()

        navigate(`/payment?purpose=order_payment&orderId=${draftId}&amount=${finalTotal}`)
        return
      }

      const orderId = await createOrderFromCart({
        items: itemsPayload,
        paymentSource,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        contactMethods: validContacts,
      })

      // If checkout was from cart, clear main cart
      if (!directItemRaw) {
        clearCart()
      }
      removeCoupon()

      // Refresh wallet profile balance if wallet payment
      if (paymentSource === 'wallet' && refreshProfile) {
        await refreshProfile()
      }

      navigate(`/order-success?orderId=${orderId}&method=wallet&amount=${finalTotal}`)

    } catch (caughtError) {
      setError(caughtError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        <p className="font-bold text-[#0b7e74]">Checkout</p>
        <h1 className="mt-2 text-4xl font-black">Complete your purchase</h1>

        <div className="mt-8 rounded-2xl bg-neutral-50 p-5 dark:bg-neutral-950">
          <p className="text-sm font-bold text-neutral-500">Wallet balance</p>
          <p className="mt-2 text-3xl font-black">{formatCurrency(profile?.walletBalance)}</p>
        </div>

        {/* REQUIRED CUSTOMER PROCESSING INPUTS */}
        {requiredFieldList.length > 0 && (
          <div className="mt-8 rounded-2xl border border-black/10 bg-neutral-50 p-5 dark:border-white/10 dark:bg-neutral-950 space-y-4">
            <h3 className="text-sm font-black flex items-center gap-2">
              <span>Required Account / Processing Details</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Please provide the requested info for items in your cart so we can fulfill your order.
            </p>

            <div className="space-y-3 pt-2">
              {requiredFieldList.map((field) => (
                <div key={field.id}>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                    {field.label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={field.type || 'text'}
                    value={customerInputs[field.label] || ''}
                    onChange={(e) =>
                      setCustomerInputs((prev) => ({
                        ...prev,
                        [field.label]: e.target.value,
                      }))
                    }
                    placeholder={field.placeholder || `Enter ${field.label}...`}
                    className="mt-1.5 w-full rounded-xl border border-black/10 bg-white p-3 text-xs font-medium outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MANDATORY CONTACT METHOD SECTION */}
        {!isContactValid ? (
          <div className="mt-8 rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <Tag className="h-4 w-4" />
              <span>Contact Information Required (At least 1 method is required)</span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Please configure at least 1 contact method below so admins can reach you for 2FA codes or order fulfillment updates.
            </p>
            <ContactMethodsEditor
              initialMethods={contactMethods.length > 0 ? contactMethods : [{ priority: 1, type: 'Email', value: profile?.email || '' }]}
              onSave={handleSaveContacts}
              title="Set Up Contact Priorities"
            />
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-3 dark:border-white/5">
              <div>
                <h3 className="text-sm font-black flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-[#0b7e74]" /> Contact Priorities (For 2FA & Support)
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  Admins will reach out using these priorities if 2FA code or verification is needed.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {contactFeePercent > 0 ? (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-500/20 dark:text-amber-400">
                    +{contactFeePercent}% Contact Surcharge
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
                    0% Surcharge
                  </span>
                )}

                <Link
                  to="/account"
                  className="text-[11px] font-bold text-[#0b7e74] hover:underline shrink-0"
                >
                  Edit in Settings →
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 font-mono">
              {validContacts.map((cm, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-black/5 bg-neutral-50 p-3 dark:border-white/5 dark:bg-neutral-950/60"
                >
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                    {idx === 0 ? 'Primary' : idx === 1 ? 'Secondary' : 'Backup'}
                  </span>
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block mt-0.5">
                    {cm.type}
                  </span>
                  <span className="text-xs font-black text-[#0b7e74] truncate block mt-0.5 select-all">
                    {cm.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl bg-red-500/10 p-4 text-xs font-bold text-red-500">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || checkoutItems.length === 0 || !isContactValid}
            onClick={() => startCheckout('wallet')}
            className="cursor-pointer rounded-full bg-neutral-950 px-6 py-3 font-black text-white shadow-lg transition hover:bg-[#0b7e74] hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-[#0b7e74] dark:hover:text-white"
          >
            Pay from wallet
          </button>
          <button
            type="button"
            disabled={busy || checkoutItems.length === 0 || !isContactValid}
            onClick={() => startCheckout('manual_payment')}
            className="cursor-pointer rounded-full bg-gradient-to-r from-[#0fa697] to-[#ff655b] px-6 py-3 font-black text-white shadow-lg transition hover:opacity-90 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit manual payment
          </button>
        </div>
      </div>

      {/* RIGHT ORDER SUMMARY */}
      <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 self-start">
        <h2 className="text-xl font-black">Order Summary</h2>

        <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
          {checkoutItems.map((item) => (
            <div key={item.cartItemId || item.id} className="flex justify-between py-3 text-xs font-bold">
              <div>
                <p>{item.name}</p>
                {item.variantName && <p className="text-[10px] text-neutral-400">Option: {item.variantName}</p>}
                <p className="text-neutral-500 font-normal mt-0.5">Qty: {item.quantity}</p>
              </div>
              <p className="font-mono">{formatCurrency((item.priceMmk || item.price) * item.quantity)}</p>
            </div>
          ))}
        </div>

        {/* COUPON CODE FORM */}
        <div className="mt-6 border-t border-black/10 pt-4 dark:border-white/10">
          {appliedCoupon ? (
            <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <div className="flex items-center gap-1.5">
                <Tag className="h-4 w-4" />
                <span>
                  Coupon "{appliedCoupon.code}" (
                  {appliedCoupon.discountLabel ||
                    (appliedCoupon.discountPercent
                      ? `${appliedCoupon.discountPercent}% OFF`
                      : 'Applied')}
                  )
                </span>
              </div>
              <button
                type="button"
                onClick={removeCoupon}
                className="cursor-pointer p-1 text-emerald-700 hover:text-red-500 dark:text-emerald-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplyCoupon} className="flex gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter coupon code..."
                className="w-full rounded-xl border border-black/10 bg-neutral-50 px-3 py-2 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
              />
              <button
                type="submit"
                disabled={couponLoading || !inputCode.trim()}
                className="cursor-pointer rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0b7e74] disabled:opacity-50 dark:bg-neutral-800"
              >
                {couponLoading ? '...' : 'Apply'}
              </button>
            </form>
          )}

          {couponError && (
            <p className="mt-2 text-[11px] font-bold text-red-500">{couponError}</p>
          )}
        </div>

        <div className="mt-6 space-y-2 border-t border-black/10 pt-4 font-bold dark:border-white/10">
          <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span>Subtotal</span>
            <span className="font-mono">{formatCurrency(subtotal)}</span>
          </div>

          {couponDiscountMmk > 0 && (
            <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
              <span>
                Discount (
                {appliedCoupon?.discountLabel ||
                  (appliedCoupon?.discountPercent
                    ? `${appliedCoupon.discountPercent}% OFF`
                    : 'Coupon')}
                )
              </span>
              <span className="font-mono">-{formatCurrency(couponDiscountMmk)}</span>
            </div>
          )}

          {contactFeeMmk > 0 && (
            <div className="flex justify-between text-xs text-amber-600 dark:text-amber-400">
              <span>Contact Priority Fee (+{contactFeePercent}%)</span>
              <span className="font-mono">+{formatCurrency(contactFeeMmk)}</span>
            </div>
          )}

          {(taxPercent > 0 || serviceFeePercent > 0) && (
            <p className="text-[10px] font-semibold text-neutral-500 pt-1">
              *Tax Included.
            </p>
          )}

          <div className="flex justify-between text-base font-black text-[#0b7e74] pt-2 border-t border-black/5 dark:border-white/5">
            <span>Total Price</span>
            <span className="font-mono">{formatCurrency(finalTotal)}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

