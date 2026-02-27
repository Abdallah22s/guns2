'use client'

import { useEffect, useCallback, useState } from 'react'
import { useTranslations } from '@/app/translations'
import { PUBLIC_URL } from '@/app/config/config'

/**
 * WeaponResultsModal Component
 * Professional modal for displaying detected weapon images
 */
export default function WeaponResultsModal({ 
  isOpen, 
  onClose, 
  weapons = [], 
  isRTL = false,
  onDeleteImage = null
}) {
  const t = useTranslations(isRTL)
  const [localWeapons, setLocalWeapons] = useState(weapons)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    setLocalWeapons(weapons)
  }, [weapons])

  const handleDelete = async (weapon, index) => {
    if (!onDeleteImage) return
    
    setDeletingId(index)
    try {
      await onDeleteImage(weapon)
      setLocalWeapons(prev => prev.filter((_, i) => i !== index))
    } catch (err) {
      console.error('Failed to delete image:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`
        relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh]
        flex flex-col animate-in fade-in zoom-in-95 duration-200
        ${isRTL ? 'rtl' : 'ltr'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t('weaponDetected')}
              </h2>
              <p className="text-sm text-gray-500">
                {t('detectedImagesCount')}: {weapons.length}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={t('close')}
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6">
          {weapons.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500">{t('noWeaponFoundInVideo')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {localWeapons.map((weapon, index) => (
                <div 
                  key={index} 
                  className="group bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-red-300 hover:shadow-lg transition-all duration-200"
                >
                  <div className="relative aspect-video bg-gray-200">
                    {weapon.image_path ? (
                      <img 
                        src={`${PUBLIC_URL}/${weapon.image_path}`} 
                        alt={`${t('weaponDetected')} ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    
                    <div className="absolute top-2 right-2 flex gap-1">
                      <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                        #{index + 1}
                      </span>
                      {onDeleteImage && (
                        <button
                          onClick={() => handleDelete(weapon, index)}
                          disabled={deletingId === index}
                          className="p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                          title={t('delete')}
                        >
                          {deletingId === index ? (
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-3 space-y-1">
                    <p className="text-sm font-semibold text-red-600 truncate">
                      {weapon.status || t('weaponDetected')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {weapon.datetime}
                    </p>
                    {weapon.confidence && (
                      <div className="flex items-center gap-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-red-500 h-1.5 rounded-full" 
                            style={{ width: `${weapon.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {weapon.confidence}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('close')}
          </button>
          {weapons.length > 0 && (
            <button
              onClick={() => {
                // Export functionality
                const dataStr = JSON.stringify(weapons, null, 2)
                const blob = new Blob([dataStr], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `weapon-detections-${new Date().toISOString().split('T')[0]}.json`
                link.click()
              }}
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t('exportResults')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
