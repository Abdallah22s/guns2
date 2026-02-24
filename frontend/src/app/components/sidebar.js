'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { FooterLogo } from './footerlogo'
import { routerBase } from '../config/config'
import { useGlobalContext } from '../context/store'
import { useTranslations } from '../translations'

/**
 * Sidebar Component
 * Navigation sidebar with RTL support
 */
export const Sidebar = () => {
    const pathname = usePathname()
    const { isRTL } = useGlobalContext()
    const t = useTranslations(isRTL)
    const [active, setActive] = useState()
    
    useEffect(() => {
        let path = pathname.split("/")[2]
        if (path) setActive(path)
    }, [pathname])
    
    return (
        <>
            {/* Desktop Sidebar */}
            <div className={`fixed hidden md:block w-0 md:w-56 h-screen bg-gray-dark ${isRTL ? 'right-0' : 'left-0'}`}>
                <div>
                    <ul className='pt-2'>
                        <li>
                            <Link 
                                className={`${isRTL ? 'pr-8' : 'pl-8'} block ${active=="cameras" ? "bg-black-600" : ""} py-3.5 cursor-pointer text-white hover:bg-black-600 focus:bg-black-600 active:bg-black`}
                                href={routerBase+"dashboard/cameras"}>
                                {t('allCameras')}
                            </Link>
                        </li>
                        <li>
                            <Link 
                                className={`${isRTL ? 'pr-8' : 'pl-8'} block ${active=="notifications" ? "bg-black-600" : ""} py-3.5 cursor-pointer text-white hover:bg-black-600 focus:bg-black-600 active:bg-black`}
                                href={routerBase+"dashboard/notifications"}>
                                {t('notifications')}
                            </Link>
                        </li>
                        <li>
                            <Link 
                                className={`${isRTL ? 'pr-8' : 'pl-8'} block ${active=="allAlert" ? "bg-black-600" : ""} py-3.5 cursor-pointer text-white hover:bg-black-600 focus:bg-black-600 active:bg-black`}
                                href={routerBase+"dashboard/allAlert"}>
                                {t('alertList')}
                            </Link>
                        </li>
                    </ul>
                    <div className={`bottom-4 ${isRTL ? 'right-8' : 'left-8'}`}>
                        <FooterLogo type="dark" />
                    </div>
                </div>
            </div>
            
            {/* Mobile Navigation */}
            <div className="w-screen block md:hidden">
                <ul className='grid grid-cols-2'>
                    <li>
                        <Link 
                            className={`${active=="cameras" ? "border-b-2 border-black bg-white" : "bg-black-300"} text-center block py-3.5 cursor-pointer text-black hover:bg-black-100 focus:bg-black-100 active:bg-white`}
                            href={routerBase+"dashboard/cameras"}>
                            {t('allCameras')}
                        </Link>
                    </li>
                    <li>
                        <Link 
                            className={`${active=="notifications" ? "border-b-2 border-black bg-white" : "bg-black-300"} border-black text-center block py-3.5 cursor-pointer text-black hover:bg-black-100 focus:bg-black-100 active:bg-white`}
                            href={routerBase+"dashboard/notifications"}>
                            {t('notifications')}
                        </Link>
                    </li>
                </ul>
            </div>
        </>
    )
}
