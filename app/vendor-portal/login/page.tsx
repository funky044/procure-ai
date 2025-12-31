'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VendorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/vendor-portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      router.push('/vendor-portal');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-950 to-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-2xl">🏢</span>
            </div>
            <span className="text-2xl font-semibold bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
              Vendor Portal
            </span>
          </div>
          <p className="text-surface-500">Sign in to manage your quotes and orders</p>
        </div>

        <div className="bg-surface-900/50 border border-surface-800 rounded-2xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Vendor Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-100 placeholder-surface-600 outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="vendor@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-100 placeholder-surface-600 outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-lg text-white font-medium hover:shadow-lg hover:shadow-emerald-500/25 transition-all disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-surface-500">
            Not a vendor yet?{' '}
            <a href="mailto:vendors@procure-ai.com" className="text-emerald-400 hover:text-emerald-300">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
