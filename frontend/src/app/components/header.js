'use client'

import React, { useEffect, useState } from 'react'
import { io } from "socket.io-client";
import CustomeNotification from './CustomeNotification';
import { useGlobalContext } from '../context/store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { routerBase } from '../config/config';
import { useTranslations } from '../translations';

const socket = io("http://localhost:5001");

/**
 * Header Component
 * Professional navigation header with RTL support
 */
const Header = () => {
    const router = useRouter()
    const { alerts, setAlerts, isRTL, setIsRTL } = useGlobalContext();
    const [components, setComponents] = useState([]);
    const t = useTranslations(isRTL);

    const handleClick = () => {
        router.push(routerBase + "dashboard/notifications")
    }

    const toggleRTL = () => {
        setIsRTL(!isRTL);
        // Store preference in localStorage
        localStorage.setItem('isRTL', !isRTL);
    };

    // Load RTL preference on mount - run only once
    useEffect(() => {
        const savedRTL = localStorage.getItem('isRTL');
        if (savedRTL !== null) {
            setIsRTL(savedRTL === 'true');
        }
    }, []);

    const handleAddDynamicComponent = (data) => {
        const newComponent = <CustomeNotification 
            onClick={handleClick} 
            onClose={handleRemoveDynamicComponent} 
            message={data.video_name + ":" + data.status} 
            id={data._id} 
            type={"alert"}
        />;
        setComponents((prev) => [...prev, newComponent]);
    };

    const handleRemoveDynamicComponent = (componentKey) => {
        setComponents((prev) => prev.filter((c) => c.key !== componentKey));
    };

    useEffect(() => {
        const timer = setInterval(() => {
            if (components.length > 0) {
                handleRemoveDynamicComponent(components[0].key);
            }
        }, 50000);
        return () => clearInterval(timer);
    }, [components]);

    useEffect(() => {
        socket.on('connect', () => console.log('Socket connected'));
        socket.on('msg', (data) => {
            const updateData = JSON.parse(data);
            setAlerts(updateData);
            handleAddDynamicComponent(JSON.parse(data));
        });
        return () => socket.disconnect();
    }, []);

    return (
        <div className={`fixed top-0 w-screen z-50 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="bg-black shadow-lg">
                <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
                    {/* Logo Section - Removed */}

                    {/* Actions Section */}
                    <div className="flex items-center gap-3">
                        {/* Dashboard Icon */}
                        <Link 
                            href={routerBase + "dashboard"}
                            className="p-2 text-white hover:text-blue-400 transition-colors"
                            title={t('dashboard')}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </Link>

                        {/* All Cameras Icon */}
                        <Link 
                            href={routerBase + "dashboard/cameras"}
                            className="p-2 text-white hover:text-green-400 transition-colors"
                            title={t('allCameras')}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </Link>

                        {/* Video Upload Icon */}
                        <Link 
                            href={routerBase + "dashboard/cameras/video"}
                            className="p-2 text-white hover:text-purple-400 transition-colors"
                            title={t('addVideo')}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </Link>

                        {/* Notifications Icon */}
                        <Link 
                            href={routerBase + "dashboard/notifications"}
                            className="p-2 text-white hover:text-yellow-400 transition-colors relative"
                            title={t('notifications')}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {alerts.length > 0 && (
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                            )}
                        </Link>

                        {/* RTL/LTR Toggle Button */}
                        <button
                            onClick={toggleRTL}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-white bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                            title={isRTL ? t('ltrTitle') : t('rtlTitle')}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M3 12h12M3 19h12M16 5l4 4-4 4M16 12l4 4-4 4" />
                            </svg>
                            {isRTL ? t('ltr') : t('rtl')}
                        </button>

                        {/* Add Camera Icon */}
                        <Link 
                            href={routerBase + "dashboard/cameras/add"}
                            className="p-2 text-white hover:text-green-400 transition-colors"
                            title={t('addCamera')}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </Link>
                    </div>
                </nav>
            </header>

            {/* Notifications - positioned based on RTL */}
            <div className={`fixed top-16 z-50 space-y-2 ${isRTL ? 'left-4' : 'right-4'}`}>
                {components.map((component, index) => (
                    <div key={index}>
                        {component}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Header