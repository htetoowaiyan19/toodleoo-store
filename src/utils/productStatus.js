export const PRODUCT_STATUS_OPTIONS = [
  {
    value: 'instock',
    label: 'In Stock',
    sub: 'Instant, less than 15 minutes',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    dotClass: 'bg-emerald-500',
    isAvailable: true,
  },
  {
    value: 'pre-order',
    label: 'Pre-Order',
    sub: 'Up to 48 hours',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    dotClass: 'bg-amber-500',
    isAvailable: true,
  },
  {
    value: 'out-of-stock',
    label: 'Out of Stock',
    sub: '',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    dotClass: 'bg-rose-500',
    isAvailable: false,
  },
]

export function getProductStatusDetails(status, stock) {
  if (status === 'pre-order' || status === 'preorder') {
    return PRODUCT_STATUS_OPTIONS[1]
  }
  if (stock !== undefined && stock !== null && Number(stock) < 1) {
    return PRODUCT_STATUS_OPTIONS[2]
  }
  if (status === 'out-of-stock') {
    return PRODUCT_STATUS_OPTIONS[2]
  }
  return PRODUCT_STATUS_OPTIONS[0]
}

export function getLowestPriceInStockVariant(product) {
  if (!Array.isArray(product?.variants) || product.variants.length === 0) {
    return null
  }

  const isPreorderProduct = product.status === 'pre-order' || product.status === 'preorder'
  const inStockVariants = isPreorderProduct
    ? product.variants
    : product.variants.filter((v) => Number(v.stock ?? 0) > 0)
  const pool = inStockVariants.length > 0 ? inStockVariants : product.variants

  let lowest = pool[0]
  for (let i = 1; i < pool.length; i++) {
    if (Number(pool[i].priceMmk || 0) < Number(lowest.priceMmk || 0)) {
      lowest = pool[i]
    }
  }

  return lowest
}
