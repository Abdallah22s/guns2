'use client'

import { useTranslations } from '@/app/translations'

/**
 * ScanIntervalSelector Component
 * Professional scan interval selector (5-10 seconds)
 */
export default function ScanIntervalSelector({ 
  value, 
  onChange, 
  isRTL = false 
}) {
  const t = useTranslations(isRTL)

  const intervals = [
    { value: 5, label: '5s', description: t('fastScan') },
    { value: 10, label: '10s', description: t('balancedScan') }
  ]

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold mb-3 text-gray-700">
        {t('weaponSnapshotInterval')}
      </label>
      
      <div className="flex gap-3">
        {intervals.map((interval) => (
          <button
            key={interval.value}
            type="button"
            onClick={() => onChange(interval.value)}
            className={`
              flex-1 flex flex-col items-center p-3 rounded-lg border-2
              transition-all duration-200
              ${value === interval.value 
                ? 'border-purple-500 bg-purple-50 text-purple-700' 
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }
            `}
          >
            <span className="text-lg font-bold">{interval.label}</span>
            <span className="text-xs mt-1 opacity-75">{interval.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
