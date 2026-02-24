import { GlobalContextProvider } from './context/store'
import { ClientBody } from './context/ClientBody'
import AlertManager from './components/AlertManager'
import './globals.css'
import { Montserrat } from 'next/font/google'

const montserrat = Montserrat({ weight: ['400', '600'], subsets: ['latin'] })

export const metadata = {
  title: 'Threat Detect',
  description: 'Weapon Detection Web Application',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <GlobalContextProvider>
          <ClientBody className={montserrat.className}>
            {children}
            <AlertManager />
          </ClientBody>
        </GlobalContextProvider>
      </body>
    </html>
  )
}
