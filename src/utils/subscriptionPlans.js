/**
 * Toodleoo VIP Subscription Plans & Benefits Configuration
 */

export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free Plan',
    tier: 'free',
    badge: 'Free Plan',
    iconName: 'Shield',
    description: 'Basic shopping with standard wallet and custom order limits.',
    priceMonthlyMmk: 0,
    priceYearlyMmk: 0,
    walletLimitMmk: 1000000,
    customOrderLimitPerDay: 3,
    memberDiscountPercent: 0,
    preOrderPriority: 'Standard Priority',
    extendedWarrantyMonths: 0,
    freeServicePlusMonths: 0,
    textColorClass: 'text-neutral-700 dark:text-neutral-300',
    color: '#737373',
    gradient: 'from-neutral-500 to-neutral-700',
    highlight: false,
    perks: [
      { text: '1,000,000 MMK Personal Wallet Limit', included: true },
      { text: '3 Custom Orders per day', included: true },
      { text: 'Standard Pre-order queue', included: true },
      { text: 'Standard Product Warranty', included: true },
      { text: 'Member Store Discounts', included: false },
      { text: 'Free Service+ Warranty Months', included: false },
    ],
  },
  lunar: {
    id: 'lunar',
    name: 'Toodleoo Lunar',
    tier: 'lunar',
    badge: 'Toodleoo Lunar',
    iconName: 'Moon',
    description: 'Ideal for frequent gamers and software enthusiasts.',
    priceMonthlyMmk: 4999,
    priceYearlyMmk: 49999,
    walletLimitMmk: 3000000,
    customOrderLimitPerDay: 10,
    memberDiscountPercent: 5,
    preOrderPriority: 'Higher Priority',
    extendedWarrantyMonths: 2,
    freeServicePlusMonths: 1,
    textColorClass: 'text-[#0b7e74] dark:text-[#67dccf]',
    color: '#0b7e74',
    gradient: 'from-[#0b7e74] to-[#064e47]',
    highlight: false,
    perks: [
      { text: '3,000,000 MMK Personal Wallet Limit', included: true },
      { text: '10 Custom Orders per day', included: true },
      { text: '5% Member Discount on all products', included: true },
      { text: 'Higher priority queue on Pre-orders', included: true },
      { text: '+2 Months extended warranty with Service+', included: true },
      { text: '1 Month Free Service+ on standard items', included: true },
    ],
  },
  lunar_plus: {
    id: 'lunar_plus',
    name: 'Toodleoo Lunar+',
    tier: 'lunar_plus',
    badge: 'Toodleoo Lunar+',
    iconName: 'Sparkles',
    description: 'Our most popular plan for power users and collectors.',
    priceMonthlyMmk: 9999,
    priceYearlyMmk: 99999,
    walletLimitMmk: 5000000,
    customOrderLimitPerDay: 30,
    memberDiscountPercent: 5,
    preOrderPriority: 'Higher Priority',
    extendedWarrantyMonths: 2,
    freeServicePlusMonths: 1,
    textColorClass: 'text-purple-600 dark:text-purple-400',
    color: '#8b5cf6',
    gradient: 'from-purple-600 to-indigo-700',
    highlight: true,
    perks: [
      { text: '5,000,000 MMK Personal Wallet Limit', included: true },
      { text: '30 Custom Orders per day', included: true },
      { text: '5% Member Discount on all products', included: true },
      { text: 'Higher priority queue on Pre-orders', included: true },
      { text: '+2 Months extended warranty with Service+', included: true },
      { text: '1 Month Free Service+ on standard items', included: true },
    ],
  },
  stellar: {
    id: 'stellar',
    name: 'Toodleoo Stellar',
    tier: 'stellar',
    badge: 'Toodleoo Stellar',
    iconName: 'Crown',
    description: 'The ultimate VIP tier with maximum limits and highest priority.',
    priceMonthlyMmk: 49999,
    priceYearlyMmk: 499999,
    walletLimitMmk: 20000000,
    customOrderLimitPerDay: Infinity,
    memberDiscountPercent: 15,
    preOrderPriority: 'Highest Priority (Up to 24h Faster Delivery)',
    extendedWarrantyMonths: 6,
    freeServicePlusMonths: 3,
    textColorClass: 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent font-black',
    color: '#eab308',
    gradient: 'from-amber-500 to-yellow-600',
    highlight: false,
    perks: [
      { text: '20,000,000 MMK Personal Wallet Limit', included: true },
      { text: 'Unlimited Custom Orders per day', included: true },
      { text: '15% Member Discount on all products', included: true },
      { text: 'Highest priority & up to 24h faster delivery', included: true },
      { text: '+6 Months extended warranty with Service+', included: true },
      { text: '3 Months Free Service+ on standard items', included: true },
    ],
  },
}

/**
 * Get active subscription details and status from user profile
 */
export function getUserSubscription(profile) {
  if (!profile) return { plan: SUBSCRIPTION_PLANS.free, isActive: false, isExpired: false }

  const tier = (profile.subscriptionTier || profile.subscription_tier || 'free').toLowerCase()
  const plan = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.free

  if (tier === 'free') {
    return {
      plan,
      tier: 'free',
      isActive: true,
      isExpired: false,
      billingCycle: null,
      expiresAt: null,
      autoRenew: false,
      daysRemaining: null,
    }
  }

  const expiresAt = profile.subscriptionExpiresAt || profile.subscription_expires_at
  const expiryDate = expiresAt ? new Date(expiresAt) : null
  const now = new Date()
  const isExpired = expiryDate ? expiryDate <= now : false
  const isActive = !isExpired
  const activePlan = isActive ? plan : SUBSCRIPTION_PLANS.free

  const daysRemaining = expiryDate
    ? Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  return {
    plan: activePlan,
    rawPlan: plan,
    tier: activePlan.tier,
    isActive,
    isExpired,
    billingCycle: profile.subscriptionBilling || profile.subscription_billing || 'monthly',
    expiresAt,
    autoRenew: Boolean(profile.subscriptionAutoRenew ?? profile.subscription_auto_renew ?? true),
    startedAt: profile.subscriptionStartedAt || profile.subscription_started_at,
    daysRemaining,
  }
}

/**
 * Calculate member discount on product / cart subtotal
 */
export function calculateMemberDiscount(subtotalMmk, tier = 'free') {
  if (!subtotalMmk || subtotalMmk <= 0) return 0
  const plan = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.free
  const pct = plan.memberDiscountPercent || 0
  return Math.round((subtotalMmk * pct) / 100)
}

/**
 * Get wallet balance capacity limit for tier
 */
export function getWalletLimit(tier = 'free') {
  const plan = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.free
  return plan.walletLimitMmk || 1000000
}

/**
 * Get custom orders daily limit for tier
 */
export function getCustomOrderLimit(tier = 'free') {
  const plan = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.free
  return plan.customOrderLimitPerDay || 3
}

/**
 * Get extended warranty and free service+ months for tier
 */
export function getServicePlusPerks(tier = 'free') {
  const plan = SUBSCRIPTION_PLANS[tier] || SUBSCRIPTION_PLANS.free
  return {
    extendedWarrantyMonths: plan.extendedWarrantyMonths || 0,
    freeServicePlusMonths: plan.freeServicePlusMonths || 0,
  }
}
