import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { auth, signIn, signOut } from '@/auth'
import { SessionProvider } from 'next-auth/react'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI News | Laboro.AI',
  description: 'Laboro.AIのAIニュースサイト。最新のAI動向を社員と共有します。',
}

async function SignInButton() {
  const session = await auth()

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        {session.user.image && (
          <img
            src={session.user.image}
            alt={session.user.name ?? 'ユーザー'}
            className="w-8 h-8 rounded-full"
          />
        )}
        <span className="text-sm text-gray-300 hidden sm:inline">
          {session.user.name}
        </span>
        <form
          action={async () => {
            'use server'
            await signOut()
          }}
        >
          <button
            type="submit"
            className="text-sm text-gray-300 hover:text-white px-3 py-1.5 rounded border border-gray-600 hover:border-gray-400 transition-colors"
          >
            サインアウト
          </button>
        </form>
      </div>
    )
  }

  return (
    <form
      action={async () => {
        'use server'
        await signIn('google')
      }}
    >
      <button
        type="submit"
        className="text-sm bg-white text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded font-medium transition-colors"
      >
        Googleでサインイン
      </button>
    </form>
  )
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="ja">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <SessionProvider session={session}>
          <header className="bg-gray-900 text-white shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center gap-6">
                  <Link href="/" className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">AI News</span>
                    <span className="text-xs text-blue-400 font-medium hidden sm:inline">
                      by Laboro.AI
                    </span>
                  </Link>
                  <nav className="flex items-center gap-1">
                    <Link
                      href="/"
                      className="text-sm text-gray-300 hover:text-white px-3 py-2 rounded hover:bg-gray-800 transition-colors"
                    >
                      ホーム
                    </Link>
                    {session?.user && (
                      <Link
                        href="/admin"
                        className="text-sm text-gray-300 hover:text-white px-3 py-2 rounded hover:bg-gray-800 transition-colors"
                      >
                        管理
                      </Link>
                    )}
                  </nav>
                </div>
                <SignInButton />
              </div>
            </div>
          </header>
          <main>{children}</main>
          <footer className="bg-gray-900 text-gray-400 text-center text-sm py-6 mt-16">
            <p>&copy; {new Date().getFullYear()} Laboro.AI. All rights reserved.</p>
          </footer>
        </SessionProvider>
      </body>
    </html>
  )
}
