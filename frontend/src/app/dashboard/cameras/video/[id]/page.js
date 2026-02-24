'use client'

import EditCameraVideoForm from '@/app/components/editCameraVideoForm'
import { useGlobalContext } from '@/app/context/store'
import { useTranslations } from '@/app/translations'
import { useParams } from 'next/navigation'
import React from 'react'

export default function EditCameraVideoPage() {
  const { isRTL } = useGlobalContext()
  const t = useTranslations(isRTL)
  const params = useParams()
  const { id } = params

  return (
    <div className=''>
      <div className='container px-8 mt-8'>
        <h1 className='text-3xl py-2 font-semibold'>{t('videoLinkTitle')}</h1>
        <EditCameraVideoForm camId={id} />
      </div>
    </div>
  )
}
