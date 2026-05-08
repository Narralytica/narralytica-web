import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: {
    default: 'Narralytica | Crypto Market Context Terminal',
    template: '%s | Narralytica',
  },
  description:
    'Narralytica is a crypto market context terminal for market pulse, ETF flows, liquidity, macro catalysts, news, treasury activity, and narrative rotation.',
  applicationName: 'Narralytica',
  keywords: [
    'Narralytica',
    'crypto market terminal',
    'market context',
    'ETF flows',
    'crypto liquidity',
    'Bitcoin market data',
    'Ethereum market data',
    'macro crypto analysis',
  ],
  authors: [{ name: 'Narralytica' }],
  creator: 'Narralytica',
  publisher: 'Narralytica',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Narralytica',
    title: 'Narralytica | Crypto Market Context Terminal',
    description:
      'A crypto market context terminal for pulse, structure, ETF flows, liquidity, macro catalysts, news, treasury activity, and narrative rotation.',
  },
  twitter: {
    card: 'summary',
    title: 'Narralytica | Crypto Market Context Terminal',
    description:
      'A crypto market context terminal for pulse, structure, ETF flows, liquidity, macro catalysts, news, treasury activity, and narrative rotation.',
  },
  category: 'finance',
  icons: {
    icon: [{ url: '/icon.svg?v=4', type: 'image/svg+xml' }],
    shortcut: [{ url: '/icon.svg?v=4', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg?v=4', type: 'image/svg+xml' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#050505',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} bg-background`}>
      <body className="font-sans antialiased overflow-x-hidden">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}


