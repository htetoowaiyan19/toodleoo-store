import { getServicePlusPerks } from './subscriptionPlans'

/**
 * Calculate comprehensive Service+ warranty details for an item
 * 
 * @param {Object} params
 * @param {Object} params.item - Order item or product item object
 * @param {string|Date} [params.orderDeliveredAt] - Delivery timestamp
 * @param {string|Date} [params.orderCreatedAt] - Order placement timestamp
 * @param {string} [params.userTier] - Active subscription tier of user ('free'|'lunar'|'lunar_plus'|'stellar')
 * @returns {Object} Full warranty calculation
 */
export function calculateItemWarranty({ item, orderDeliveredAt, orderCreatedAt, userTier = 'free' }) {
  if (!item) return null

  const perks = getServicePlusPerks(userTier)
  const isTaggedServicePlus = Boolean(item.hasServicePlus || item.has_service_plus)
  const defaultBaseMonths = Number(item.warrantyMonths || item.warranty_months || 18)

  let baseMonths = 0
  let memberBonusMonths = 0
  let isFreeServicePlusPerk = false

  if (isTaggedServicePlus) {
    baseMonths = defaultBaseMonths
    memberBonusMonths = perks.extendedWarrantyMonths || 0
  } else if (perks.freeServicePlusMonths > 0) {
    // Non-Service+ item covered by Lunar / Stellar Free Service+ perk
    baseMonths = perks.freeServicePlusMonths
    memberBonusMonths = 0
    isFreeServicePlusPerk = true
  }

  const totalMonths = baseMonths + memberBonusMonths
  const hasWarranty = totalMonths > 0

  if (!hasWarranty) {
    return {
      hasWarranty: false,
      isTaggedServicePlus: false,
      isFreeServicePlusPerk: false,
      baseMonths: 0,
      memberBonusMonths: 0,
      totalMonths: 0,
      startDate: null,
      expiresAt: null,
      daysRemaining: 0,
      status: 'none',
      statusLabel: 'No Warranty',
      percentElapsed: 100,
    }
  }

  const startDate = orderDeliveredAt ? new Date(orderDeliveredAt) : orderCreatedAt ? new Date(orderCreatedAt) : new Date()
  const expiresAt = new Date(startDate.getTime())
  expiresAt.setMonth(expiresAt.getMonth() + totalMonths)

  const now = new Date()
  const totalDurationMs = expiresAt.getTime() - startDate.getTime()
  const elapsedMs = Math.max(0, now.getTime() - startDate.getTime())
  const percentElapsed = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)))

  const isExpired = now >= expiresAt
  const daysRemaining = isExpired ? 0 : Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  let status = 'active'
  let statusLabel = 'Active Protection'

  if (isExpired) {
    status = 'expired'
    statusLabel = 'Expired'
  } else if (daysRemaining <= 30) {
    status = 'expiring_soon'
    statusLabel = 'Expiring Soon'
  }

  return {
    hasWarranty: true,
    isTaggedServicePlus,
    isFreeServicePlusPerk,
    baseMonths,
    memberBonusMonths,
    totalMonths,
    startDate,
    expiresAt,
    daysRemaining,
    status,
    statusLabel,
    percentElapsed,
  }
}
