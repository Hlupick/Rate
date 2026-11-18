import type { Metadata } from 'next'
import './globals.css'
import { PlayerProvider } from '@/components/player/PlayerProvider'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'monah', template: '%s · monah' },
  description: 'Музыка, которую добавляют сами слушатели.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="font-sans">
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  )
}
