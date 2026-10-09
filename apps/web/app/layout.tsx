import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { AppProviders } from '@/components/app-providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Notes',
  description: 'The example feature that runs through every layer of this template',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="app-surface">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
