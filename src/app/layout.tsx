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
  description:
    'Jonathan Ng (j6n) — Site Reliability Engineer in Toronto. Observability, internal platforms, homelab, and the automation that makes shipping calm.',
}

// Runs before first paint: mark whether this load wants the text-only site
// (?mobile) or the 3D scene, so the server-rendered text site doesn't flash
// on phones that are about to swap in the scene. Without JS neither class
// is set and the text site stays visible.
const MODE_SCRIPT =
  "document.documentElement.classList.add(/[?&]mobile(=|&|$)/.test(location.search)?'want-text':'want-scene')"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className='dark' lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
