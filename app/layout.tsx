import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Samastey — Your AI School',
  description: 'Personalized K-12 learning that adapts to how you think',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-white text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
