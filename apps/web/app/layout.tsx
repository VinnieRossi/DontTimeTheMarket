import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: "Don't Time The Market",
  description:
    'Trade a real, randomized slice of market history and see if you can beat buy-and-hold.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="app-surface">{children}</body>
    </html>
  )
}
