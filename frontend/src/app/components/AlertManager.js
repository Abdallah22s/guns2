'use client'

import { useState, useEffect } from 'react'
import { API_URL } from '@/app/config/config'
import { useGlobalContext } from '@/app/context/store'
import { useTranslations } from '@/app/translations'
import axios from 'axios'

/**
 * AlertManager Component
 * Manages weapon detection alerts and notifications
 */
export default function AlertManager() {
  const { isRTL } = useGlobalContext()
  const t = useTranslations(isRTL)
  const [alerts, setAlerts] = useState([])
  const [notifications, setNotifications] = useState([])

  // Function to add weapon detection alert
  const addWeaponAlert = (weaponData) => {
    const newAlert = {
      id: Date.now(),
      type: 'weapon_detected',
      title: t('weaponDetected') || 'Weapon Detected',
      message: `${t('weaponsDetectedCount')}: ${weaponData.length}`,
      timestamp: new Date().toISOString(),
      weapons: weaponData,
      read: false
    }

    // Add to alerts
    setAlerts(prev => [newAlert, ...prev])

    // Add to notifications
    const newNotification = {
      id: Date.now(),
      type: 'weapon_detected',
      title: t('weaponDetected') || 'Weapon Detected',
      message: `${weaponData.length} ${t('weapons') || 'weapons'} detected`,
      timestamp: new Date().toISOString(),
      read: false
    }
    setNotifications(prev => [newNotification, ...prev])
  }

  // Function to mark as read
  const markAsRead = (id, type) => {
    if (type === 'alert') {
      setAlerts(prev => prev.map(alert => 
        alert.id === id ? { ...alert, read: true } : alert
      ))
    } else {
      setNotifications(prev => prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      ))
    }
  }

  // Function to clear all
  const clearAll = (type) => {
    if (type === 'alert') {
      setAlerts([])
    } else {
      setNotifications([])
    }
  }

  // Expose functions to window for external use
  useEffect(() => {
    window.addWeaponAlert = addWeaponAlert
    return () => {
      delete window.addWeaponAlert
    }
  }, [])

  return null // This component manages state only
}
