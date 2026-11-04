import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './laptop.css'
import './three.css'
import './mobile.css'
import './resume/resume.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Jonathan Ng — Site Reliability Engineer',
  description: 'Jonathan Ng (j6n) — Site Reliability Engineer in Toronto. Building reliable systems, useful tools, and creative experiments.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
