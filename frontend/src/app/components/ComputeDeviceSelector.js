'use client'

import { useTranslations } from '@/app/translations'

/**
 * ComputeDeviceSelector Component
 * Professional compute device selector with GPU/CPU options
 */
export default function ComputeDeviceSelector({ 
  value, 
  onChange, 
  isRTL = false 
}) {
  const t = useTranslations(isRTL)

  const devices = [
    { 
      id: 'cpu', 
      label: t('scanWithCpu'), 
      description: t('cpuDescription'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      )
    },
    { 
      id: 'gpu', 
      label: t('scanWithGpu'), 
      description: t('gpuDescription'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M20 18l2-1v-2.5" />
        </svg>
      )
    }
  ]

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold mb-3 text-gray-700">
        {t('computeDevice')}
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        {devices.map((device) => (
          <button
            key={device.id}
            type="button"
            onClick={() => onChange(device.id)}
            className={`
              relative flex flex-col items-center p-4 rounded-lg border-2 
              transition-all duration-200 ease-in-out
              ${value === device.id 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }
            `}
          >
            <div className={`mb-2 ${value === device.id ? 'text-blue-600' : 'text-gray-400'}`}>
              {device.icon}
            </div>
            <span className="font-semibold text-sm">{device.label}</span>
            <span className="text-xs mt-1 opacity-75">{device.description}</span>
            
            {value === device.id && (
              <div className="absolute top-2 right-2">
                <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
