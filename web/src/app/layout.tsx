import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import { WalletProvider } from '@/contexts/WalletContext'
import { ToastProvider } from '@/contexts/ToastContext'
import '../styles/globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AgentL2 - AI Agent Layer 2 Network',
  description: 'The first Layer 2 blockchain built for autonomous AI agents to register, transact, and earn.',
  keywords: 'AI agents, blockchain, layer 2, ethereum, web3, autonomous agents, DeFi',
  authors: [{ name: 'AgentL2 Team' }],
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'AgentL2 - AI Agent Layer 2 Network',
    description: 'The first Layer 2 blockchain built for autonomous AI agents.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentL2 - AI Agent Layer 2 Network',
    description: 'The first Layer 2 blockchain built for autonomous AI agents.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">
        <WalletProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  )
}
