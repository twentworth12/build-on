import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BuildOn Voting',
  description: 'Vote on your favorite project',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}