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

      const orderId = await createOrderFromCart({
        items: itemsPayload,
        paymentSource,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        contactMethods,
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

      if (paymentSource === 'manual_payment') {
        navigate(`/payment?purpose=order_payment&orderId=${orderId}&amount=${finalTotal}`)
      } else {
        navigate(`/order-success?orderId=${orderId}&method=wallet&amount=${finalTotal}`)
      }
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
          <div className="mt-8 rounded-2xl border border-[#0b7e74]/20 bg-[#0b7e74]/5 p-5 space-y-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#0b7e74] flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> Required Processing Information
              </p>
              <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                Please enter your account / top-up information so our team can process your order.
              </p>
            </div>

            <div className="space-y-3">
              {requiredFieldList.map((field) => (
                <div key={field.label}>
                  <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {field.label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type={field.type || 'text'}
                    required
                    value={customerInputs[field.label] || ''}
                    onChange={(e) =>
                      setCustomerInputs((prev) => ({ ...prev, [field.label]: e.target.value }))
                    }
                    placeholder={field.placeholder || `Enter ${field.label}...`}
                    className="mt-1.5 w-full rounded-xl border border-black/10 bg-white p-3 text-xs font-medium outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
                  />

                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTACT METHOD PRIORITIES */}
        <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <ContactMethodsEditor
            initialMethods={contactMethods}
            onSave={handleSaveContacts}
            title="Order Contact Method Priorities (For 2FA & Order Updates)"
          />
        </div>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-500/10 p-4 text-xs font-bold text-red-500">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || checkoutItems.length === 0}
            onClick={() => startCheckout('wallet')}
            className="cursor-pointer rounded-full bg-neutral-950 px-6 py-3 font-black text-white shadow-lg transition hover:bg-[#0b7e74] hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-[#0b7e74] dark:hover:text-white"
          >
            Pay from wallet
          </button>
          <button
            type="button"
            disabled={busy || checkoutItems.length === 0}
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

