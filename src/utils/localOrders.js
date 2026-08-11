const STORAGE_KEY = 'toodleoo_pending_draft_orders'

export function getLocalPendingOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveLocalPendingOrder(orderData) {
  try {
    const current = getLocalPendingOrders()
    const updated = [orderData, ...current.filter((o) => o.id !== orderData.id)]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return orderData
  } catch (err) {
    console.error('Error saving local pending order:', err)
    return orderData
  }
}

export function removeLocalPendingOrder(orderId) {
  try {
    const current = getLocalPendingOrders()
    const updated = current.filter((o) => o.id !== orderId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('Error removing local pending order:', err)
  }
}

export function getLocalPendingOrderById(orderId) {
  const current = getLocalPendingOrders()
  return current.find((o) => o.id === orderId) || null
}
