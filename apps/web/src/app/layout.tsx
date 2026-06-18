import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Menu đặt món',
  description: 'Xem menu và đặt món online',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
