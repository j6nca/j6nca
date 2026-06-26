import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './resume/resume.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Jonathan Ng — Site Reliability Engineer',
  description:
    'Jonathan Ng (j6n) — Site Reliability Engineer in Toronto. Observability, internal platforms, homelab, and the automation that makes shipping calm.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className='dark' lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
