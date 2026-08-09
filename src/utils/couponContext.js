import { createContext, useContext } from 'react'

export const CouponContext = createContext({
  appliedCoupon: null,
  couponDiscountMmk: 0,
  applyCoupon: async () => {},
  removeCoupon: () => {},
})

export function useCoupon() {
  return useContext(CouponContext)
}
