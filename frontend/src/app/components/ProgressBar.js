'use client'

import { useTranslations } from '@/app/translations'

/**
 * ProgressBar Component
 * Professional progress bar with status indicators
 */
export default function ProgressBar({ 
  progress, 
  status,
  isRTL = false,
  showPercentage = true,
  animated = true 
}) {
  const t = useTranslations(isRTL)

  const getStatusColor = () => {
    if (progress >= 100) return 'bg-green-500'
    if (progress > 50) return 'bg-blue-500'
    return 'bg-blue-600'
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-semibold text-gray-700">{t('scanProgress')}</span>
        <div className="flex items-center gap-2">
          {progress < 100 && (
            <svg 
              className={`w-4 h-4 text-blue-600 ${animated ? 'animate-spin' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {showPercentage && (
            <span className="font-medium text-gray-900">{Math.round(progress)}%</span>
          )}
        </div>
      </div>

      <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className={`
            h-full rounded-full transition-all duration-500 ease-out
            ${getStatusColor()}
            ${animated && progress < 100 ? 'animate-pulse' : ''}
          `}
          style={{ width: `${Math.min(progress, 100)}%` }}
        >
          {progress < 100 && (
            <div className="absolute inset-0 bg-white opacity-20 animate-pulse" />
          )}
        </div>
        
        {/* Gradient overlay for better visual */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
          style={{ 
            transform: `translateX(${(progress - 100)}%)`,
            transition: 'transform 0.5s ease-out'
          }}
        />
      </div>

      {status && (
        <p className={`
          text-sm mt-2 font-medium
          ${progress >= 100 ? 'text-green-600' : 'text-gray-600'}
        `}>
          {status}
        </p>
      )}
    </div>
  )
}
