'use client'

import { useGlobalContext } from '../context/store'

export default function DirWrapper({ children }) {
  const { isRTL } = useGlobalContext()
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="min-h-screen">
      {children}
    </div>
  )
}
