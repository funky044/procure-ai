'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface AnalyticsData {
  spendByCategory: Array<{ category: string; amount: number; count: number }>;
  spendByMonth: Array<{ month: string; amount: number }>;
  vendorPerformance: Array<{
    vendor: string;
    totalOrders: number;
    totalValue: number;
    avgDeliveryDays: number;
    onTimeRate: number;
  }>;
  savingsSummary: {
    totalSavings: number;
    avgSavingsPercent: number;
    negotiationsCount: number;
  };
  topItems: Array<{ description: string; quantity: number; totalSpend: number }>;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('90');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session, dateRange]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/analytics?days=${dateRange}`);
      if (res.ok) {
        const analyticsData = await res.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-surface-950 to-surface-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-surface-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const maxSpend = Math.max(...(data?.spendByMonth.map(m => m.amount) || [1]));

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-950 to-surface-900">
      {/* Header */}
      <header className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">⚡</span>
              </div>
              <span className="text-xl font-semibold bg-gradient-to-r from-primary-400 to-primary-300 bg-clip-text text-transparent">
                ProcureAI
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-4 py-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50">
                Dashboard
              </Link>
              <Link href="/" className="px-4 py-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50">
                New Request
              </Link>
              <Link href="/budgets" className="px-4 py-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50">
                Budgets
              </Link>
              <Link href="/analytics" className="px-4 py-2 rounded-lg bg-primary-500/10 text-primary-400 font-medium">
                Analytics
              </Link>
            </nav>
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-200 text-sm outline-none"
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-surface-100 mb-8">Procurement Analytics</h1>

        {/* Savings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-6"
          >
            <div className="text-emerald-400 text-sm font-medium mb-1">Total Savings</div>
            <div className="text-3xl font-bold text-white">
              ${(data?.savingsSummary.totalSavings || 0).toLocaleString()}
            </div>
            <div className="text-emerald-400/70 text-sm mt-1">
              From {data?.savingsSummary.negotiationsCount || 0} negotiations
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface-900/50 border border-surface-800 rounded-xl p-6"
          >
            <div className="text-surface-400 text-sm font-medium mb-1">Avg. Savings Rate</div>
            <div className="text-3xl font-bold text-primary-400">
              {(data?.savingsSummary.avgSavingsPercent || 0).toFixed(1)}%
            </div>
            <div className="text-surface-500 text-sm mt-1">Per negotiation</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface-900/50 border border-surface-800 rounded-xl p-6"
          >
            <div className="text-surface-400 text-sm font-medium mb-1">Active Vendors</div>
            <div className="text-3xl font-bold text-surface-100">
              {data?.vendorPerformance.length || 0}
            </div>
            <div className="text-surface-500 text-sm mt-1">With orders</div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Spend by Month */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface-900/50 border border-surface-800 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-surface-100 mb-4">Monthly Spend</h3>
            <div className="space-y-3">
              {data?.spendByMonth.map((month, i) => (
                <div key={month.month} className="flex items-center gap-3">
                  <div className="w-16 text-sm text-surface-500">{month.month}</div>
                  <div className="flex-1">
                    <div className="h-6 bg-surface-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(month.amount / maxSpend) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right text-sm font-medium text-surface-200">
                    ${month.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Spend by Category */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-surface-900/50 border border-surface-800 rounded-xl p-6"
          >
            <h3 className="text-lg font-semibold text-surface-100 mb-4">Spend by Category</h3>
            <div className="space-y-4">
              {data?.spendByCategory.map((cat, i) => {
                const colors = ['bg-primary-500', 'bg-emerald-500', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500'];
                return (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${colors[i % colors.length]}`} />
                      <span className="text-sm text-surface-300 capitalize">{cat.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-surface-200">
                        ${cat.amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-surface-500">{cat.count} orders</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Vendor Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-surface-900/50 border border-surface-800 rounded-xl overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-surface-800">
            <h3 className="text-lg font-semibold text-surface-100">Vendor Performance</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase">Total Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase">Avg Delivery</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase">On-Time Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {data?.vendorPerformance.map((vendor) => (
                <tr key={vendor.vendor} className="hover:bg-surface-800/30">
                  <td className="px-6 py-4 text-sm font-medium text-surface-200">{vendor.vendor}</td>
                  <td className="px-6 py-4 text-sm text-surface-400">{vendor.totalOrders}</td>
                  <td className="px-6 py-4 text-sm text-surface-300">${vendor.totalValue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-surface-400">{vendor.avgDeliveryDays} days</td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${
                      vendor.onTimeRate >= 95 ? 'text-emerald-400' :
                      vendor.onTimeRate >= 85 ? 'text-amber-400' :
                      'text-red-400'
                    }`}>
                      {vendor.onTimeRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </main>
    </div>
  );
}
