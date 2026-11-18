import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PlayerProvider } from '@/components/player/PlayerProvider'
import { PwaClient } from '@/components/pwa/PwaClient'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Rate', template: '%s · Rate' },
  description: 'Музыка, которую добавляют сами слушатели.',
  applicationName: 'Rate',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Rate',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#101010',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="font-sans">
        <PlayerProvider>
          {children}
          <PwaClient />
        </PlayerProvider>
      </body>
    </html>
  )
}
