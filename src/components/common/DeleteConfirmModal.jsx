import { useEffect, useState } from 'react'

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Permanently?',
  message = 'Warning: This action cannot be undone. You cannot recover this data once deleted.',
  isDeleting = false,
}) {
  const [cooldown, setCooldown] = useState(5)

  useEffect(() => {
    if (!isOpen) return

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(timer)
      setCooldown(5)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-500/10">
            <svg className="h-6 w-6 stroke-current" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-black">{title}</h3>
        </div>

        <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
          <p className="font-bold">⚠️ Data Loss Warning</p>
          <p className="mt-1 leading-5">{message}</p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="cursor-pointer rounded-full border border-black/10 px-5 py-2.5 text-xs font-bold transition hover:bg-neutral-100 dark:border-white/10 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={cooldown > 0 || isDeleting}
            onClick={onConfirm}
            className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-black text-white transition ${
              cooldown > 0 || isDeleting
                ? 'cursor-not-allowed bg-rose-400/50 opacity-60'
                : 'cursor-pointer bg-rose-600 hover:bg-rose-700 active:scale-[0.98]'
            }`}
          >
            {isDeleting ? (
              'Deleting...'
            ) : cooldown > 0 ? (
              <span>Confirm Delete ({cooldown}s)</span>
            ) : (
              'Yes, Delete Permanently'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
