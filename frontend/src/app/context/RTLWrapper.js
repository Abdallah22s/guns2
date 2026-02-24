'use client'

import { useGlobalContext } from './store'

export default function RTLWrapper({ children }) {
  const { isRTL } = useGlobalContext()
  
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'rtl' : 'ltr'}>
      {children}
    </div>
  )
}
