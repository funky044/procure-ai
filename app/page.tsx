'use client';

import { useSession, signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Chat from '@/components/chat/Chat';

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="h-screen bg-gradient-to-b from-surface-950 to-surface-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">⚡</span>
          </div>
          <p className="text-surface-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    redirect('/auth/signin');
  }

  const user = session.user as any;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-surface-950 to-surface-900">
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-surface-800/50 bg-surface-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <span className="text-xl">⚡</span>
            </div>
            <span className="text-xl font-semibold bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
              ProcureAI
            </span>
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            <button className="relative p-2.5 rounded-lg bg-surface-800/50 hover:bg-surface-800 transition-colors">
              <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-800/50 border border-surface-700/50">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-sm font-semibold text-white">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-surface-200">{user?.name || 'User'}</div>
                <div className="text-xs text-surface-500">{user?.department || 'Team'}</div>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="p-2.5 rounded-lg bg-surface-800/50 hover:bg-red-500/20 hover:text-red-400 transition-colors text-surface-400"
              title="Sign out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-hidden">
        <Chat />
      </main>
    </div>
  );
}
