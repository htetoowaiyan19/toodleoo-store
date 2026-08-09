import { useState, useCallback, useMemo } from 'react'
import { CouponContext } from '../../utils/couponContext'
import { validateCouponCode } from '../../services/storeService'

export function CouponProvider({ children }) {
  const [appliedCoupon, setAppliedCoupon] = useState(null)

  const applyCoupon = useCallback(async (code, cartItems = []) => {
    if (!code || !code.trim()) {
      return { success: false, message: 'Please enter a coupon code.' }
    }

    try {
      const res = await validateCouponCode(code, cartItems)
      if (res && res.valid) {
        setAppliedCoupon({
          id: res.coupon_id,
          code: res.code,
          discountPercent: res.discount_percent,
          discountType: res.discount_type,
          discountAmountMmk: res.discount_amount_mmk || 0,
          message: res.message,
        })
        return { success: true, message: res.message || 'Coupon applied successfully!' }
      } else {
        setAppliedCoupon(null)
        return { success: false, message: res?.message || 'Invalid coupon code.' }
      }
    } catch (err) {
      setAppliedCoupon(null)
      return { success: false, message: err.message || 'Failed to validate coupon code.' }
    }
  }, [])

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null)
  }, [])

  const value = useMemo(
    () => ({
      appliedCoupon,
      couponDiscountMmk: appliedCoupon ? Number(appliedCoupon.discountAmountMmk || 0) : 0,
      applyCoupon,
      removeCoupon,
    }),
    [appliedCoupon, applyCoupon, removeCoupon],
  )

  return <CouponContext.Provider value={value}>{children}</CouponContext.Provider>
}
