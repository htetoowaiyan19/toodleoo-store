export function formatNumber(value = 0) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function formatCurrency(value = 0) {
  return `MMK ${formatNumber(value)}`
}

export function formatUsd(usd = 0) {
  const num = Number(usd || 0)
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDualCurrency(usd = 0, exchangeRate = 4500) {
  const mmk = Math.round(Number(usd || 0) * Number(exchangeRate || 4500))
  return `${formatCurrency(mmk)} (${formatUsd(usd)})`
}

export function formatPriceRange(minUsd, maxUsd, exchangeRate = 4500) {
  const minMmk = Math.round(Number(minUsd || 0) * Number(exchangeRate || 4500))
  const maxMmk = Math.round(Number(maxUsd || 0) * Number(exchangeRate || 4500))

  if (minUsd === maxUsd) return formatCurrency(minMmk)
  return `MMK ${formatNumber(minMmk)} - ${formatNumber(maxMmk)}`
}
