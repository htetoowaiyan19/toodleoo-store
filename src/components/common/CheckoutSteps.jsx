import { ShoppingBag, CreditCard, CheckCircle2, Check } from 'lucide-react'
import { useTranslation } from '../../utils/useTranslation'

export function CheckoutSteps({ currentStep = 1 }) {
  const { t } = useTranslation()

  const steps = [
    {
      number: 1,
      id: 'checkout',
      label: t('checkout.step1Title', 'Checkout'),
      desc: t('checkout.step1Desc', 'Cart & Details'),
      icon: ShoppingBag,
    },
    {
      number: 2,
      id: 'payment',
      label: t('checkout.step2Title', 'Payment'),
      desc: t('checkout.step2Desc', 'Wallet or Transfer'),
      icon: CreditCard,
    },
    {
      number: 3,
      id: 'completion',
      label: t('checkout.step3Title', 'Completion'),
      desc: t('checkout.step3Desc', 'Order Confirmed'),
      icon: CheckCircle2,
    },
  ]

  const activeIndex = typeof currentStep === 'number' ? currentStep : steps.findIndex((s) => s.id === currentStep) + 1

  return (
    <div className="mx-auto max-w-xl px-4 py-4 sm:py-6">
      <div className="relative flex items-center justify-between">
        {/* CONTINUOUS CONNECTING LINE TRACK */}
        <div className="absolute left-[16.66%] right-[16.66%] top-4 sm:top-5 -translate-y-1/2 h-[2px] bg-neutral-200 dark:bg-neutral-800 -z-0">
          {/* ACTIVE PROGRESS FILL */}
          <div
            className="h-full bg-[#0b7e74] transition-all duration-500 ease-out"
            style={{
              width: activeIndex === 1 ? '0%' : activeIndex === 2 ? '50%' : '100%',
            }}
          />
        </div>

        {/* STEP NODES */}
        {steps.map((step) => {
          const isCompleted = activeIndex > step.number
          const isCurrent = activeIndex === step.number
          const Icon = step.icon

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
              {/* ICON CONTAINER */}
              <div
                className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg transition-all duration-300 ring-4 ring-white dark:ring-neutral-950 ${
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-[#0b7e74] text-white shadow-md shadow-[#0b7e74]/25 scale-105'
                    : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 stroke-[2.5]" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>

              {/* LABELS */}
              <div className="mt-2 text-center px-1">
                <p
                  className={`text-xs sm:text-sm font-bold tracking-tight transition-colors ${
                    isCurrent
                      ? 'text-[#0b7e74] dark:text-[#67dccf]'
                      : isCompleted
                      ? 'text-neutral-900 dark:text-white'
                      : 'text-neutral-400 dark:text-neutral-500'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[10px] sm:text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 whitespace-nowrap">
                  {step.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}



