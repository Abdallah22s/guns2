'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { API_URL, routerBase } from '@/app/config/config'
import { useGlobalContext } from '@/app/context/store'
import { useTranslations } from '@/app/translations'
import axios from 'axios'
import Link from 'next/link'
import FileUpload from '@/app/components/FileUpload'
import ComputeDeviceSelector from '@/app/components/ComputeDeviceSelector'
import ModelSelector from '@/app/components/ModelSelector'
import ScanIntervalSelector from '@/app/components/ScanIntervalSelector'
import ProgressBar from '@/app/components/ProgressBar'
import WeaponResultsModal from '@/app/components/WeaponResultsModal'

export default function ProcessVideoPage({ params }) {
  const { id: cameraId } = params
  const { isRTL } = useGlobalContext()
  const t = useTranslations(isRTL)

  const [selectedFile, setSelectedFile] = useState(null)
  const [computeDevice, setComputeDevice] = useState('cpu')
  const [selectedModel, setSelectedModel] = useState('yolov9c')
  const [scanInterval, setScanInterval] = useState(5)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [weapons, setWeapons] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState(null)
  
  const scanPollRef = useRef(null)

  const stopPolling = () => {
    if (scanPollRef.current) {
      clearInterval(scanPollRef.current)
      scanPollRef.current = null
    }
  }

  useEffect(() => {
    return () => stopPolling()
  }, [])

  const handleFileSelect = useCallback((file) => {
    setSelectedFile(file)
    setError(null)
  }, [])

  const handleProcess = async () => {
    if (!selectedFile) {
      setError(t('noFileSelected'))
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setStatus(t('uploading'))
    setError(null)
    stopPolling()

    try {
      // Step 1: Upload video
      const uploadData = new FormData()
      uploadData.append('video', selectedFile)
      
      const uploadResponse = await axios.post(
        `${API_URL}/camera/cameras/upload-video`,
        uploadData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setProgress(Math.round(percent * 0.5))
          }
        }
      )

      const videoLink = uploadResponse.data?.video_link
      if (!videoLink) {
        throw new Error('Upload failed')
      }

      setProgress(50)
      setStatus(t('processingVideoPleaseWait'))

      // Step 2: Start scan
      const scanResponse = await axios.post(
        `${API_URL}/camera/cameras/scan-video/start`,
        {
          video_link: videoLink,
          compute_device: computeDevice,
          model: selectedModel,
          scan_profile: 'balanced',
          snapshot_interval_seconds: scanInterval,
          capture_name: `camera_${cameraId}_scan`
        }
      )

      const jobId = scanResponse.data?.job_id
      if (!jobId) {
        throw new Error('Failed to start scan')
      }

      // Step 3: Poll for status
      scanPollRef.current = setInterval(async () => {
        try {
          const statusResponse = await axios.get(
            `${API_URL}/camera/cameras/scan-video/status/${jobId}`
          )
          const jobStatus = statusResponse.data

          const processingProgress = jobStatus.progress || 0
          setProgress(50 + Math.round(processingProgress * 0.5))

          if (jobStatus.status === 'running') {
            setStatus(jobStatus.message || t('processingVideoPleaseWait'))
          }

          if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
            stopPolling()
            setIsProcessing(false)
            setProgress(100)

            if (jobStatus.status === 'failed') {
              setError(t('videoScanFailed'))
              setStatus('')
            } else {
              // Use the scan result directly from job status
              if (jobStatus.weapon_images && jobStatus.weapon_images.length > 0) {
                const updatedWeapons = jobStatus.weapon_images.map((imageName, index) => ({
                  image_path: `${jobStatus.scan_name}/${imageName}`,
                  datetime: new Date().toLocaleString(),
                  status: t('weaponDetected'),
                  confidence: Math.round((parseFloat(imageName.split('_')[2].replace('.jpg', '')) * 100))
                }))
                setWeapons(updatedWeapons)
                
                // Add to alerts and notifications
                if (window.addWeaponAlert) {
                  window.addWeaponAlert(updatedWeapons)
                }
                // Also trigger custom event for notifications page
                window.dispatchEvent(new CustomEvent('weaponAlert', { detail: updatedWeapons }))
              }
              setStatus(t('weaponFoundInVideo'))
            }
          }
        } catch (pollError) {
          console.error('Polling error:', pollError)
          stopPolling()
          setIsProcessing(false)
          setError(t('videoScanFailed'))
        }
      }, 1000)

    } catch (err) {
      console.error('Processing error:', err)
      setError(t('videoScanFailed'))
      setStatus('')
      setIsProcessing(false)
      stopPolling()
    }
  }

  return (
    <div className={`min-h-screen bg-gray-50 py-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Link 
              href={routerBase + 'dashboard/cameras'}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">{t('processVideo')}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t('processVideo')}</h1>
          <p className="mt-2 text-gray-600">{t('processVideoDescription')}</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Configuration Section */}
          <div className="p-6 lg:p-8 space-y-8">
            {/* AI Model */}
            <ModelSelector
              value={selectedModel}
              onChange={setSelectedModel}
              isRTL={isRTL}
            />

            {/* Compute Device */}
            <ComputeDeviceSelector
              value={computeDevice}
              onChange={setComputeDevice}
              isRTL={isRTL}
            />

            {/* File Upload */}
            <FileUpload 
              onFileSelect={handleFileSelect}
              isRTL={isRTL}
            />

            {/* Scan Interval */}
            <ScanIntervalSelector
              value={scanInterval}
              onChange={setScanInterval}
              isRTL={isRTL}
            />
          </div>

          {/* Progress Section */}
          {isProcessing && (
            <div className="px-6 lg:px-8 pb-6">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <ProgressBar 
                  progress={progress}
                  status={status}
                  isRTL={isRTL}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="px-6 lg:px-8 pb-6">
              <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {!isProcessing && weapons.length > 0 && (
            <div className="px-6 lg:px-8 pb-6">
              <div className="p-4 bg-green-50 rounded-xl border border-green-200 flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-green-700 font-medium">{status}</p>
                  <p className="text-green-600 text-sm mt-1">
                    {t('weaponsDetectedCount')}: {weapons.length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-6 lg:px-8 py-6 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleProcess}
                disabled={!selectedFile || isProcessing}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-6 py-3 
                  rounded-xl font-semibold text-white
                  transition-all duration-200
                  ${!selectedFile || isProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:transform active:scale-[0.98]'
                  }
                `}
              >
                {isProcessing ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('processing')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t('scanUploadedVideo')}
                  </>
                )}
              </button>

              {weapons.length > 0 && (
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all duration-200 hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {t('show')} ({weapons.length})
                </button>
              )}

              <Link
                href={routerBase + 'dashboard/cameras'}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t('cancel')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Results Modal */}
      <WeaponResultsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        weapons={weapons}
        isRTL={isRTL}
        onDeleteImage={async (weapon) => {
          try {
            await axios.post(`${API_URL}/camera/inference-images/delete`, {
              image_path: weapon.image_path
            })
            setWeapons(prev => prev.filter(w => w.image_path !== weapon.image_path))
          } catch (err) {
            console.error('Failed to delete image:', err)
            throw err
          }
        }}
      />
    </div>
  )
}
