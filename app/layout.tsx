import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LocalAI - Smart Local Discovery',
  description: 'AI-powered recommendations for dining and home services. Make confident decisions with explainable AI matching.',
  keywords: ['local business', 'restaurants', 'home services', 'AI recommendations', 'Yelp'],
  authors: [{ name: 'LocalAI Team' }],
  openGraph: {
    title: 'LocalAI - Smart Local Discovery',
    description: 'AI-powered recommendations for dining and home services',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
