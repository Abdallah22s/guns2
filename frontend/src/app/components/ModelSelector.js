'use client'

import { useTranslations } from '@/app/translations'

/**
 * ModelSelector Component
 * Professional YOLO model selector with latest models
 */
export default function ModelSelector({ 
  value, 
  onChange, 
  isRTL = false 
}) {
  const t = useTranslations(isRTL)

  const models = [
    { 
      id: 'yolov8n', 
      label: 'YOLOv8', 
      description: 'Nano (3.2M)',
      speed: '⚡⚡⚡',
      accuracy: 'Good',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    { 
      id: 'yolov8s', 
      label: 'YOLOv8', 
      description: 'Small (11.2M)',
      speed: '⚡⚡',
      accuracy: 'Better',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    { 
      id: 'yolov8m', 
      label: 'YOLOv8', 
      description: 'Medium (25.9M)',
      speed: '⚡',
      accuracy: 'Good',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    { 
      id: 'yolov9c', 
      label: 'YOLOv9', 
      description: 'Compact (25.4M)',
      speed: '⚡',
      accuracy: 'Excellent',
      recommended: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: 'yolov9e', 
      label: 'YOLOv9', 
      description: 'Extra (57.1M)',
      speed: '🐢',
      accuracy: 'Best',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    }
  ]

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold mb-3 text-gray-700">
        {t('modelSelector') || 'AI Model'}
      </label>
      
      <div className="grid grid-cols-2 gap-3">
        {models.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => onChange(model.id)}
            className={`
              relative flex flex-col items-center p-4 rounded-lg border-2 
              transition-all duration-200 ease-in-out
              ${value === model.id 
                ? 'border-green-500 bg-green-50 text-green-700' 
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }
            `}
          >
            {model.recommended && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                {t('recommended') || 'NEW'}
              </div>
            )}
            
            <div className={`mb-2 ${value === model.id ? 'text-green-600' : 'text-gray-400'}`}>
              {model.icon}
            </div>
            
            <span className="font-semibold text-sm">{model.label}</span>
            <span className="text-xs mt-1 opacity-75">{model.description}</span>
            
            {value === model.id && (
              <div className="absolute top-2 right-2">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
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
