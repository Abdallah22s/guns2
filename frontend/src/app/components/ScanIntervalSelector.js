'use client'

import { useTranslations } from '@/app/translations'

/**
 * ScanIntervalSelector Component
 * Dynamic snapshot interval selector (1-30 seconds)
 */
export default function ScanIntervalSelector({ 
  value, 
  onChange, 
  isRTL = false 
}) {
  const t = useTranslations(isRTL)
  const normalized = Number.isFinite(Number(value)) ? Number(value) : 5
  const clamped = Math.min(30, Math.max(1, normalized))

  const handleChange = (raw) => {
    const next = Number(raw)
    if (!Number.isFinite(next)) return
    onChange(Math.min(30, Math.max(1, next)))
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold mb-3 text-gray-700">
        {t('weaponSnapshotInterval')}
      </label>

      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>1s</span>
          <span>30s</span>
        </div>
        <input
          type="range"
          min={1}
          max={30}
          step={1}
          value={clamped}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full accent-red"
        />
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={30}
            value={clamped}
            onChange={(e) => handleChange(e.target.value)}
            className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm"
          />
          <span className="text-sm font-semibold text-gray-700">seconds</span>
        </div>
      </div>
    </div>
  )
}
