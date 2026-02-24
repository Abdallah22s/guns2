'use client'

import { FooterLogo } from "../components/footerlogo"
import Header from "../components/header"
import { Sidebar } from "../components/sidebar"
import { useGlobalContext } from "../context/store"

/**
 * DashboardLayout Component
 * Layout with RTL support for dashboard pages
 */
export default function DashboardLayout({ children }) {
  const { isRTL } = useGlobalContext()

  return (
    <section dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'rtl' : 'ltr'}>
      <Header />
      <div className={`md:flex pt-16 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="flex-none w-0 md:w-56">
          <Sidebar />
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </section>
  )
}
