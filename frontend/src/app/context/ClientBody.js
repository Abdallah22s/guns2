'use client'

import { useGlobalContext } from './store'

export function ClientBody({ children, className }) {
  const { isRTL } = useGlobalContext()
  
  return (
    <body className={className} dir={isRTL ? 'rtl' : 'ltr'}>
      {children}
    </body>
  )
}
