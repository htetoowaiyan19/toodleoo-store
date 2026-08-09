export function formatNumber(value = 0) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function formatCurrency(value = 0) {
  return `MMK ${formatNumber(value)}`
}

export function formatPriceRange(min, max) {
  if (min === max) return formatCurrency(min)
  return `MMK ${formatNumber(min)} - ${formatNumber(max)}`
}
