import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export function AnimatedSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  id,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Normalize options to [{ value, label }]
  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt,
  )

  const selectedOption = normalizedOptions.find((opt) => opt.value === value)

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* TRIGGER BUTTON */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-neutral-900 outline-none transition cursor-pointer dark:border-white/10 dark:bg-neutral-950 dark:text-white ${
          isOpen
            ? 'border-[#0b7e74] ring-2 ring-[#0b7e74]/20 shadow-sm dark:border-[#67dccf]'
            : 'hover:border-black/20 dark:hover:border-white/20'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={`truncate ${!selectedOption ? 'text-neutral-400' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ease-in-out ${
            isOpen ? 'rotate-180 text-[#0b7e74] dark:text-[#67dccf]' : ''
          }`}
        />
      </button>

      {/* DROPDOWN MENU WITH ANIMATION */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-1 max-h-60 overflow-y-auto rounded-lg border border-black/10 bg-white p-1 shadow-xl outline-none dark:border-white/10 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-150"
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold transition text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[#0b7e74]/10 text-[#0b7e74] dark:bg-[#0b7e74]/20 dark:text-[#67dccf] font-bold'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-black dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-white'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#0b7e74] dark:text-[#67dccf]" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
