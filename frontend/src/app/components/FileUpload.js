'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from '@/app/translations'

/**
 * FileUpload Component
 * Professional file upload component with drag & drop support
 */
export default function FileUpload({ 
  onFileSelect, 
  isRTL = false,
  accept = "video/*",
  maxSizeMB = 500 
}) {
  const t = useTranslations(isRTL)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState(null)

  const validateFile = (file) => {
    if (!file) return false
    
    if (!file.type.startsWith('video/')) {
      setError(t('invalidFileType'))
      return false
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(t('fileTooLarge'))
      return false
    }
    
    return true
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (validateFile(file)) {
      setSelectedFile(file)
      setError(null)
      onFileSelect?.(file)
    }
  }

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files?.[0]
    if (validateFile(file)) {
      setSelectedFile(file)
      setError(null)
      onFileSelect?.(file)
    }
  }, [onFileSelect, t])

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold mb-2 text-gray-700">
        {t('selectVideoFile')}
      </label>
      
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center
          transition-all duration-200 ease-in-out
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-white'
          }
        `}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="pointer-events-none">
          <svg 
            className="mx-auto h-12 w-12 text-gray-400 mb-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
            />
          </svg>
          
          <p className="text-sm text-gray-600 mb-1">
            {selectedFile ? selectedFile.name : t('dragDropOrClick')}
          </p>
          
          <p className="text-xs text-gray-400">
            {t('maxFileSize')}: {maxSizeMB}MB
          </p>
        </div>
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-600 animate-pulse">
          {error}
        </p>
      )}
      
      {selectedFile && (
        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-green-700 font-medium">
                {selectedFile.name}
              </span>
            </div>
            <span className="text-xs text-green-600">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
