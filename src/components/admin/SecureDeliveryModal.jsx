import { useState } from 'react'
import {
  Key,
  User,
  ExternalLink,
  FileText,
  Send,
  X,
  RefreshCw,
} from 'lucide-react'
import { deliverSecureCredentials } from '../../services/storeService'

/**
 * SecureDeliveryModal
 * Clean modal for admins to deliver digital keys, accounts, or custom credentials.
 */
export function SecureDeliveryModal({
  order,
  orderType = 'order', // 'order' | 'custom_order'
  isOpen,
  onClose,
  onDelivered,
}) {
  const [deliveryType, setDeliveryType] = useState('key') // 'key' | 'account' | 'link' | 'text'
  const [keyInput, setKeyInput] = useState('')
  const [loginInput, setLoginInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [freeformText, setFreeformText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !order) return null

  function handleGeneratePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
    let pwd = ''
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPasswordInput(pwd)
  }

  function getPreparedDelivery() {
    let message = ''
    const payload = {}

    if (deliveryType === 'key') {
      message = keyInput.trim()
      payload.key = keyInput.trim()
    } else if (deliveryType === 'account') {
      message = `Login: ${loginInput.trim()}\nPassword: ${passwordInput}`
      payload.login = loginInput.trim()
      payload.password = passwordInput
    } else if (deliveryType === 'link') {
      message = linkInput.trim()
      payload.link = linkInput.trim()
    } else {
      message = freeformText.trim()
    }

    if (notesInput.trim()) {
      payload.notes = notesInput.trim()
      if (deliveryType !== 'text') {
        message += `\n\nInstructions: ${notesInput.trim()}`
      }
    }

    return { message, payload }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const { message, payload } = getPreparedDelivery()

    if (!message.trim()) {
      alert('Please enter the delivery credentials or key.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await deliverSecureCredentials({
        orderId: order.id,
        orderType,
        deliveryType,
        deliveryMessage: message,
        deliveryPayload: payload,
      })

      if (onDelivered) {
        onDelivered(result)
      }
      onClose()
    } catch (err) {
      console.error('Failed to deliver credentials:', err)
      alert(`Delivery failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const orderTitle = orderType === 'custom_order' ? order.productName : `Order #${(order.id || '').slice(0, 8)}`
  const recipientEmail = order.userEmail || order.user_email || 'Customer'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-black/10 pb-3.5 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#0b7e74] text-white shadow-sm">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-neutral-900 dark:text-white">
                Deliver Digital Credentials
              </h3>
              <p className="text-xs text-neutral-500">
                To: <span className="font-bold text-neutral-800 dark:text-neutral-200">{recipientEmail}</span> ({orderTitle})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* DELIVERY TYPE SWITCHER */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
              Select Delivery Format
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'key', label: 'License Key', icon: Key },
                { id: 'account', label: 'Account Login', icon: User },
                { id: 'link', label: 'Activation URL', icon: ExternalLink },
                { id: 'text', label: 'Custom Text', icon: FileText },
              ].map((t) => {
                const Icon = t.icon
                const isSelected = deliveryType === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDeliveryType(t.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'border-[#0b7e74] bg-[#0b7e74]/10 text-[#0b7e74] dark:bg-[#0b7e74]/20 dark:text-[#67dccf]'
                        : 'border-black/10 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-950 dark:text-neutral-400'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 mb-1" />
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* DYNAMIC FORM FIELDS */}
          {deliveryType === 'key' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                Digital Product Key / License Code <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="e.g. 4X9KD-W2M8P-9QTRV-7YK2C-9M5Z1"
                className="w-full rounded-lg border border-black/10 bg-white p-3 font-mono text-xs font-bold outline-none transition focus:border-[#0b7e74] focus:ring-1 focus:ring-[#0b7e74]/20 dark:border-white/10 dark:bg-neutral-950"
              />
            </div>
          )}

          {deliveryType === 'account' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                  Username / Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="e.g. user@domain.com"
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2.5 font-mono text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="cursor-pointer inline-flex items-center gap-1 text-[10px] font-bold text-[#0b7e74] hover:underline"
                  >
                    <RefreshCw className="h-3 w-3" /> Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter or generate password..."
                  className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2.5 font-mono text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
                />
              </div>
            </div>
          )}

          {deliveryType === 'link' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                Activation / Team Invite URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-black/10 bg-white p-2.5 font-mono text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
              />
            </div>
          )}

          {deliveryType === 'text' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-300">
                Full Delivery Text & Instructions <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={freeformText}
                onChange={(e) => setFreeformText(e.target.value)}
                placeholder="Enter detailed delivery message, credentials, and activation instructions..."
                className="w-full rounded-lg border border-black/10 bg-white p-3 font-mono text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
              />
            </div>
          )}

          {/* OPTIONAL CUSTOMER INSTRUCTIONS */}
          {deliveryType !== 'text' && (
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Redemption Instructions / Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="e.g. Instructions on where to redeem..."
                className="w-full rounded-lg border border-black/10 bg-neutral-50 p-2.5 text-xs outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
              />
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="flex items-center justify-end gap-2.5 border-t border-black/10 pt-3.5 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg border border-black/10 px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:border-white/10 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[#0b7e74] px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#096860] active:scale-[0.99] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Delivering...' : 'Deliver Credentials to Customer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Keep SafeKeyDeliveryModal alias for backwards compatibility
export const SafeKeyDeliveryModal = SecureDeliveryModal
