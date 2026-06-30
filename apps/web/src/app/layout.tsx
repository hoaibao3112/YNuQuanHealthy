import type { Metadata } from 'next'
import { Playball, Dancing_Script, Be_Vietnam_Pro } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const playball = Playball({
  weight: '400',
  subsets: ['latin', 'vietnamese'],
  variable: '--font-playball',
  display: 'swap',
})

const dancingScript = Dancing_Script({
  weight: ['400', '700'],
  subsets: ['latin', 'vietnamese'],
  variable: '--font-dancing',
  display: 'swap',
})

const beVietnamPro = Be_Vietnam_Pro({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin', 'vietnamese'],
  variable: '--font-be-vietnam',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Menu đặt món',
  description: 'Xem menu và đặt món online',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID || 'G-Z2WSR3V7NQ'

  return (
    <html lang="vi" className={`${playball.variable} ${dancingScript.variable} ${beVietnamPro.variable}`}>
      <body className="antialiased">
        {children}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', '${gaId}');
          `}
        </Script>
      </body>
    </html>
  )
}


