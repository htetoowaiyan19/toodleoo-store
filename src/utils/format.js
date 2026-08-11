export function formatNumber(value = 0) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function formatUsd(usd = 0) {
  const num = Number(usd || 0)
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Direct MMK Formatter
 * Formats an MMK number cleanly (e.g. 443 => "MMK 443") without re-multiplying.
 */
export function formatCurrency(mmkValue = 0) {
  const val = Math.round(Number(mmkValue || 0))
  if (val <= 0) return 'MMK 0'
  return `MMK ${formatNumber(val)}`
}

/**
 * USD to All-Inclusive MMK Converter & Formatter
 * Converts a base USD price (e.g. 0.07) to MMK using Exchange Rate, Tax %, and Service Fee %.
 */
export function formatUsdToMmk(usdValue = 0, exchangeRate = 4500, taxPercent = 0, serviceFeePercent = 0) {
  const val = Number(usdValue || 0)
  if (val <= 0) return 'MMK 0'
  const multiplier = 1 + (Number(taxPercent || 0) + Number(serviceFeePercent || 0)) / 100
  const mmk = Math.round(val * Number(exchangeRate || 4500) * multiplier)
  return `MMK ${formatNumber(mmk)}`
}

export function formatPriceRange(minMmk = 0, maxMmk = 0) {
  const minVal = Math.round(Number(minMmk || 0))
  const maxVal = Math.round(Number(maxMmk || 0))

  if (minVal === maxVal) return formatCurrency(minVal)
  return `MMK ${formatNumber(minVal)} - ${formatNumber(maxVal)}`
}
