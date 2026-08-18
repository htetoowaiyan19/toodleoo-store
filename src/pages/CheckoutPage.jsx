import { useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { useCart } from '../utils/useCart'
import { useCoupon } from '../utils/couponContext'
import { useTranslation } from '../utils/useTranslation'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../utils/useAuth'
import { useProducts } from '../utils/useProducts'
import { ContactMethodsEditor, calculateContactFeePercent } from '../components/account/ContactMethodsEditor'
import { Tag, X, FileText, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react'
import { CheckoutSteps } from '../components/common/CheckoutSteps'
import { saveLocalPendingOrder } from '../utils/localOrders'
import { getUserSubscription } from '../utils/subscriptionPlans'

export function CheckoutPage() {
  const location = useLocation()
  const { clearCart, items: cartItems } = useCart()
  const { appliedCoupon, couponDiscountMmk, applyCoupon, removeCoupon } = useCoupon()
  const { profile, refreshProfile, updateProfile, user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const subData = useMemo(() => getUserSubscription(profile), [profile])
  const memberDiscountPercent = subData.plan.memberDiscountPercent || 0

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

  const memberDiscountMmk = memberDiscountPercent > 0 ? Math.round((subtotal * memberDiscountPercent) / 100) : 0

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
            label: fieldLabel || fieldId,
            placeholder: `Enter ${fieldLabel || fieldId}...`,
            type: fieldId?.includes('password') ? 'password' : 'text',
          })
        }
      })
    })

    return list
  }, [checkoutItems])

  const { taxPercent = 0, serviceFeePercent = 0 } = useProducts()

  const contactFeePercent = calculateContactFeePercent(contactMethods)
  const baseTotal = Math.max(0, subtotal - couponDiscountMmk - memberDiscountMmk)
  const contactFeeMmk = contactFeePercent > 0 ? Math.round(baseTotal * (contactFeePercent / 100)) : 0
  const finalTotal = baseTotal + contactFeeMmk

  const validContacts = Array.isArray(contactMethods)
    ? contactMethods.filter((cm) => cm.type && cm.value && cm.value.trim() !== '')
    : []
  const isContactValid = validContacts.length > 0

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

  async function proceedToPayment() {
    setError('')

    // Validate mandatory contact requirement
    if (!isContactValid) {
      setError(t('checkout.validationError'))
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

      const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const draftOrder = {
        id: draftId,
        userId: profile?.id || user?.id || null,
        userEmail: profile?.email || user?.email || 'customer@toodleoo.store',
        items: itemsPayload,
        subtotal,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        couponDiscountMmk,
        memberDiscountMmk,
        subscriptionTier: subData.tier,
        contactFeePercent,
        contactFeeMmk,
        totalMmk: finalTotal,
        totalUsd: checkoutItems.reduce((acc, i) => acc + (i.priceUsd || 0) * i.quantity, 0),
        contactMethods: validContacts,
        contact_methods: validContacts,
        status: 'pending_payment',
        isSubmitted: false,
        is_submitted: false,
        createdAt: new Date().toISOString(),
        customerInputs,
        isLocalDraft: true,
      }

      saveLocalPendingOrder(draftOrder)

      // Navigate to Step 2: Payment
      navigate(`/payment?purpose=order_payment&orderId=${draftId}&amount=${finalTotal}`, {
        state: { draftOrder, directItem: directItemRaw },
      })
    } catch (caughtError) {
      setError(caughtError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 3-STEP PIPELINE HEADER: STEP 1 (CHECKOUT) */}
      <CheckoutSteps currentStep={1} />

      <section className="mx-auto grid max-w-7xl gap-4 sm:gap-6 px-3 pb-12 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-4 sm:space-y-5">
          <div>
            <p className="font-bold text-[11px] sm:text-xs text-[#0b7e74] uppercase tracking-wider">
              {t('checkout.stepBadge', { step: 1 })}
            </p>
            <h1 className="mt-0.5 text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              {t('checkout.title')}
            </h1>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {t('checkout.subtitle')}
            </p>
          </div>

          {/* REQUIRED CUSTOMER INFORMATION INPUTS */}
          {requiredFieldList.length > 0 && (
            <div className="rounded-lg border border-black/10 bg-neutral-50 p-3.5 sm:p-4 dark:border-white/10 dark:bg-neutral-950/80">
              <h2 className="text-xs sm:text-sm font-black flex items-center gap-2 text-neutral-900 dark:text-white">
                <FileText className="h-4 w-4 text-[#0b7e74]" /> {t('checkout.requiredInfo')}
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400">
                {t('checkout.requiredInfoDesc')}
              </p>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {requiredFieldList.map((field) => (
                  <div key={field.label} className={field.id?.includes('password') || field.id?.includes('login') ? 'sm:col-span-1' : 'sm:col-span-2'}>
                    <label className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                      {field.label} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={field.type || 'text'}
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                      value={customerInputs[field.label] || ''}
                      onChange={(e) =>
                        setCustomerInputs((prev) => ({
                          ...prev,
                          [field.label]: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold outline-none transition focus:border-[#0b7e74] focus:ring-2 focus:ring-[#0b7e74]/20 dark:border-white/10 dark:bg-neutral-900"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONTACT METHODS FOR 2FA & ADMIN DELIVERY */}
          {validContacts.length > 0 && (
            <div className="rounded-lg border border-black/10 bg-white p-3.5 sm:p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-2 dark:border-white/5">
                <div>
                  <h3 className="text-xs font-black flex items-center gap-1.5 text-neutral-900 dark:text-white">
                    <Tag className="h-3.5 w-3.5 text-[#0b7e74]" /> {t('checkout.contactInfo')}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-neutral-500 dark:text-neutral-400">
                    {t('checkout.contactInfoDesc')}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
                  {contactFeePercent > 0 ? (
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 border border-amber-500/20 dark:text-amber-400">
                      +{contactFeePercent}% Fee
                    </span>
                  ) : (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/20 dark:text-emerald-400">
                      0% Fee
                    </span>
                  )}

                  <Link
                    to="/account"
                    className="text-[11px] font-bold text-[#0b7e74] hover:underline shrink-0"
                  >
                    {t('checkout.editContacts')} →
                  </Link>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 font-mono">
                {validContacts.map((cm, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-black/5 bg-neutral-50 p-2.5 dark:border-white/5 dark:bg-neutral-950/60 min-w-0"
                  >
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">
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

          {/* MANDATORY CONTACT METHOD SETUP (IF NONE CONFIGURED) */}
          {!isContactValid && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3.5 sm:p-4 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                <Tag className="h-3.5 w-3.5" />
                <span>{t('checkout.contactRequired')}</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {t('checkout.contactRequiredDesc')}
              </p>
              <ContactMethodsEditor
                initialMethods={contactMethods.length > 0 ? contactMethods : [{ priority: 1, type: 'Email', value: profile?.email || '' }]}
                onSave={async (updated) => {
                  setContactMethods(updated)
                  if (profile && updateProfile) {
                    await updateProfile({ contact_methods: updated })
                  }
                }}
                title="Set Up Contact Priorities"
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold text-red-500">
              {error}
            </div>
          )}

          {/* PRIMARY PROCEED BUTTON (VISIBLE ON DESKTOP & MOBILE) */}
          <div className="pt-2">
            <button
              type="button"
              disabled={busy || checkoutItems.length === 0 || !isContactValid}
              onClick={proceedToPayment}
              className="w-full cursor-pointer rounded-lg bg-[#0b7e74] py-3 sm:py-3.5 px-4 sm:px-6 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-[#096860] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{busy ? t('common.loading') : `${t('checkout.placeOrder')} (${formatCurrency(finalTotal)})`}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* RIGHT / SECOND COLUMN: ORDER SUMMARY */}
        <div className="rounded-xl border border-black/10 bg-white p-4 sm:p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900 self-start space-y-3">
          <h2 className="text-sm sm:text-base font-black">{t('checkout.orderSummary')}</h2>

          <div className="divide-y divide-black/5 dark:divide-white/5 max-h-64 sm:max-h-none overflow-y-auto">
            {checkoutItems.map((item) => (
              <div key={item.cartItemId || item.id} className="flex justify-between py-2 sm:py-2.5 text-xs font-semibold gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-neutral-900 dark:text-white font-bold leading-tight truncate">{item.name}</p>
                  {item.variantName && <p className="text-[10px] text-neutral-400">Option: {item.variantName}</p>}
                  <p className="text-neutral-500 font-normal mt-0.5 text-[11px]">{t('cart.quantity')}: {item.quantity}</p>
                </div>
                <p className="font-mono text-right shrink-0">{formatCurrency((item.priceMmk || item.price) * item.quantity)}</p>
              </div>
            ))}
          </div>

          {/* COUPON CODE FORM */}
          <div className="border-t border-black/10 pt-3 dark:border-white/10">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Tag className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
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
                  className="cursor-pointer p-1 text-emerald-700 hover:text-red-500 dark:text-emerald-300 rounded-md shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder={t('checkout.promoCode')}
                  className="w-full rounded-lg border border-black/10 bg-neutral-50 px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
                />
                <button
                  type="submit"
                  disabled={couponLoading || !inputCode.trim()}
                  className="cursor-pointer rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#0b7e74] disabled:opacity-50 dark:bg-neutral-800 shrink-0"
                >
                  {couponLoading ? '...' : t('checkout.applyPromo')}
                </button>
              </form>
            )}

            {couponError && (
              <p className="mt-1.5 text-[11px] font-bold text-red-500">{couponError}</p>
            )}
          </div>

          <div className="space-y-1.5 border-t border-black/10 pt-3 font-semibold dark:border-white/10 text-xs">
            <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>{t('cart.subtotal')}</span>
              <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>

            {couponDiscountMmk > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span className="truncate pr-2">
                  {t('cart.discount')} (
                  {appliedCoupon?.discountLabel ||
                    (appliedCoupon?.discountPercent
                      ? `${appliedCoupon.discountPercent}% OFF`
                      : 'Coupon')}
                  )
                </span>
                <span className="font-mono shrink-0">-{formatCurrency(couponDiscountMmk)}</span>
              </div>
            )}

            {memberDiscountMmk > 0 && (
              <div className="flex justify-between text-purple-600 dark:text-purple-400">
                <span className="flex items-center gap-1 truncate pr-2">
                  <Sparkles className="h-3 w-3 shrink-0" />
                  VIP ({subData.plan.name} - {memberDiscountPercent}%)
                </span>
                <span className="font-mono shrink-0">-{formatCurrency(memberDiscountMmk)}</span>
              </div>
            )}

            {contactFeeMmk > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                <span>Contact Surcharge (+{contactFeePercent}%)</span>
                <span className="font-mono">+{formatCurrency(contactFeeMmk)}</span>
              </div>
            )}

            {(taxPercent > 0 || serviceFeePercent > 0) && (
              <p className="text-[10px] font-normal text-neutral-500 pt-0.5">
                *Tax Included.
              </p>
            )}

            <div className="flex justify-between text-sm sm:text-base font-black text-[#0b7e74] pt-2 border-t border-black/5 dark:border-white/5">
              <span>{t('cart.total')}</span>
              <span className="font-mono">{formatCurrency(finalTotal)}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

