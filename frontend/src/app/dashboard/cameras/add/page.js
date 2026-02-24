'use client'

import AddCameraForm from '@/app/components/addCameraForm';
import axios from 'axios';
import Link from 'next/link'
import React from 'react'
import { useGlobalContext } from '@/app/context/store'
import { useTranslations } from '@/app/translations'


export default function Camera({params}) {
    const { isRTL } = useGlobalContext()
    const t = useTranslations(isRTL)
    
    return (
        <div className=''>
            <div className='container px-8 mt-8'>
                <h1 className='text-3xl py-2 font-semibold'>{t('addCamera')}</h1>
                <AddCameraForm/>
            </div>
        </div>
    )
}