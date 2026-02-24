'use client'

import { API_URL, routerBase } from '@/app/config/config';
import { useGlobalContext } from '@/app/context/store';
import axios from 'axios';
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTranslations } from '@/app/translations';

/**
 * CameraCard Component
 * Individual camera card with action buttons
 */
function CameraCard({ camera, isRTL, t }) {
  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:-translate-y-1">
      <div className="relative">
        {/* Camera Image */}
        <Link href={routerBase + "dashboard/cameras/" + camera.id}>
          <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
            <img 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
              src={routerBase + "images/cam1.png"}
              alt={camera.name}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </Link>
        
        {/* Action Buttons - Floating */}
        <div className={`absolute top-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform ${isRTL ? '-translate-x-2 group-hover:translate-x-0 left-3' : 'translate-x-2 group-hover:translate-x-0 right-3'}`}>
          <Link 
            href={routerBase + "dashboard/cameras/process/" + camera.id}
            className="p-2.5 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 hover:scale-110 transition-all duration-200"
            title={t('processVideo')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Link>
        </div>
      </div>
      
      {/* Camera Info */}
      <div className="p-4">
        <Link href={routerBase + "dashboard/cameras/" + camera.id}>
          <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
            {camera.name}
          </h3>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {camera.location}
          </p>
        </Link>
        
        {/* Quick Actions Footer */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
          <Link 
            href={routerBase + "dashboard/cameras/" + camera.id}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {t('viewDetails')}
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * AllCamerasPage Component
 * Professional cameras listing page
 */
export default function AllCamerasPage() {
  const { state, setState, isRTL } = useGlobalContext()
  const t = useTranslations(isRTL)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    axios.get(API_URL + '/camera/cameras')
      .then((response) => {
        const updateData = { ...state, cameras: response.data }
        setState(updateData)
      })
      .catch((error) => {
        console.error('Error fetching cameras:', error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  return (
    <div className={`min-h-screen bg-gray-50 py-8 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('allCameras')}</h1>
            <p className="mt-2 text-gray-600">
              {state.cameras?.length || 0} {t('camerasCount')}
            </p>
          </div>
          
          <Link 
            href={routerBase + "dashboard/cameras/add"}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 hover:shadow-lg transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('addCamera')}
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <svg className="w-10 h-10 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && (!state.cameras || state.cameras.length === 0) && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <svg className="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('noCamerasYet')}</h3>
            <Link 
              href={routerBase + "dashboard/cameras/add"}
              className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              {t('addFirstCamera')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        )}

        {/* Cameras Grid */}
        {!isLoading && state.cameras && state.cameras.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {state.cameras.map((camera) => (
              <CameraCard 
                key={camera.id} 
                camera={camera} 
                isRTL={isRTL}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}