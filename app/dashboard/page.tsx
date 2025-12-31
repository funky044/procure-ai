'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface Request {
  id: string;
  requestNumber: string;
  description: string;
  category: string;
  status: string;
  stage: string;
  budget: number;
  quantity: number;
  urgency: string;
  createdAt: string;
  updatedAt: string;
  purchaseOrder?: { poNumber: string; total: number; status: string };
  contract?: { totalValue: number };
}

interface DashboardStats {
  totalRequests: number;
  pendingApprovals: number;
  activeOrders: number;
  totalSpend: number;
  monthlySpend: number;
  savingsAmount: number;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400',
  CLARIFYING: 'bg-blue-500/20 text-blue-400',
  SOURCING: 'bg-purple-500/20 text-purple-400',
  QUOTING: 'bg-indigo-500/20 text-indigo-400',
  NEGOTIATING: 'bg-yellow-500/20 text-yellow-400',
  REVIEWING: 'bg-orange-500/20 text-orange-400',
  PENDING_APPROVAL: 'bg-amber-500/20 text-amber-400',
  APPROVED: 'bg-emerald-500/20 text-emerald-400',
  REJECTED: 'bg-red-500/20 text-red-400',
  PO_GENERATED: 'bg-teal-500/20 text-teal-400',
  ORDERED: 'bg-cyan-500/20 text-cyan-400',
  DELIVERED: 'bg-green-500/20 text-green-400',
  COMPLETED: 'bg-green-600/20 text-green-300',
  CANCELLED: 'bg-gray-600/20 text-gray-500',
};

const urgencyColors: Record<string, string> = {
  LOW: 'text-surface-500',
  MEDIUM: 'text-blue-400',
  HIGH: 'text-orange-400',
  CRITICAL: 'text-red-400',
};

export default function DashboardPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [requests, setRequests] = useState<Request[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: '',
    category: '',
    urgency: '',
    dateRange: '30',
  });

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, filter]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.category) params.set('category', filter.category);
      if (filter.dateRange) params.set('days', filter.dateRange);
      
      const [requestsRes, statsRes] = await Promise.all([
        fetch(`/api/requests?${params}`),
        fetch('/api/analytics/stats'),
      ]);
      
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data);
      }
      
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-surface-950 to-surface-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">⚡</span>
          </div>
          <p className="text-surface-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
              <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-primary-500/10 text-primary-400 font-medium">
                Dashboard
              </Link>
              <Link href="/" className="px-4 py-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50">
                New Request
              </Link>
              <Link href="/budgets" className="px-4 py-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50">
                Budgets
              </Link>
              <Link href="/analytics" className="px-4 py-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50">
                Analytics
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/api/notifications" className="relative p-2.5 rounded-lg bg-surface-800/50 hover:bg-surface-800 transition-colors">
              <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </Link>
            
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-800/50 border border-surface-700/50">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-sm font-semibold text-white">
                {session?.user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-medium text-surface-200">{session?.user?.name}</div>
                <div className="text-xs text-surface-500">{(session?.user as any)?.department || 'Team'}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface-900/50 border border-surface-800 rounded-xl p-4"
          >
            <div className="text-2xl mb-1">📋</div>
            <div className="text-2xl font-bold text-surface-100">{stats?.totalRequests || 0}</div>
            <div className="text-xs text-surface-500">Total Requests</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-surface-900/50 border border-surface-800 rounded-xl p-4"
          >
            <div className="text-2xl mb-1">⏳</div>
            <div className="text-2xl font-bold text-amber-400">{stats?.pendingApprovals || 0}</div>
            <div className="text-xs text-surface-500">Pending Approval</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface-900/50 border border-surface-800 rounded-xl p-4"
          >
            <div className="text-2xl mb-1">📦</div>
            <div className="text-2xl font-bold text-blue-400">{stats?.activeOrders || 0}</div>
            <div className="text-xs text-surface-500">Active Orders</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-surface-900/50 border border-surface-800 rounded-xl p-4"
          >
            <div className="text-2xl mb-1">💰</div>
            <div className="text-2xl font-bold text-surface-100">
              ${(stats?.totalSpend || 0).toLocaleString()}
            </div>
            <div className="text-xs text-surface-500">Total Spend</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface-900/50 border border-surface-800 rounded-xl p-4"
          >
            <div className="text-2xl mb-1">📊</div>
            <div className="text-2xl font-bold text-primary-400">
              ${(stats?.monthlySpend || 0).toLocaleString()}
            </div>
            <div className="text-xs text-surface-500">This Month</div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-surface-900/50 border border-surface-800 rounded-xl p-4"
          >
            <div className="text-2xl mb-1">💚</div>
            <div className="text-2xl font-bold text-emerald-400">
              ${(stats?.savingsAmount || 0).toLocaleString()}
            </div>
            <div className="text-xs text-surface-500">Savings</div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-4 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-200 text-sm outline-none focus:border-primary-500/50"
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="PO_GENERATED">PO Generated</option>
            <option value="ORDERED">Ordered</option>
            <option value="DELIVERED">Delivered</option>
            <option value="COMPLETED">Completed</option>
          </select>
          
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="px-4 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-200 text-sm outline-none focus:border-primary-500/50"
          >
            <option value="">All Categories</option>
            <option value="furniture">Furniture</option>
            <option value="it">IT Equipment</option>
            <option value="office">Office Supplies</option>
            <option value="software">Software</option>
          </select>
          
          <select
            value={filter.urgency}
            onChange={(e) => setFilter({ ...filter, urgency: e.target.value })}
            className="px-4 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-200 text-sm outline-none focus:border-primary-500/50"
          >
            <option value="">All Urgency</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          
          <select
            value={filter.dateRange}
            onChange={(e) => setFilter({ ...filter, dateRange: e.target.value })}
            className="px-4 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-200 text-sm outline-none focus:border-primary-500/50"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
            <option value="">All time</option>
          </select>
          
          <Link
            href="/"
            className="ml-auto px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 rounded-lg text-white text-sm font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
          >
            + New Request
          </Link>
        </div>

        {/* Requests Table */}
        <div className="bg-surface-900/50 border border-surface-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wide">Request</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wide">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wide">Urgency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-surface-500">
                      <div className="text-4xl mb-2">📋</div>
                      No requests found. <Link href="/" className="text-primary-400 hover:underline">Create your first request</Link>
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="hover:bg-surface-800/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-surface-200">{request.requestNumber}</div>
                        <div className="text-xs text-surface-500">{request.category || 'General'}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-surface-300 max-w-xs truncate">
                          {request.description || 'No description'}
                        </div>
                        {request.quantity && (
                          <div className="text-xs text-surface-500">Qty: {request.quantity}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[request.status] || 'bg-gray-500/20 text-gray-400'}`}>
                          {request.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-sm font-medium ${urgencyColors[request.urgency]}`}>
                          {request.urgency}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-surface-200">
                          ${(request.purchaseOrder?.total || request.contract?.totalValue || request.budget || 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-surface-400">
                          {format(new Date(request.createdAt), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-surface-500">
                          {format(new Date(request.createdAt), 'h:mm a')}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/requests/${request.id}`}
                            className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 rounded-md text-xs text-surface-300 transition-colors"
                          >
                            View
                          </Link>
                          {request.status === 'DRAFT' && (
                            <button className="px-3 py-1.5 bg-primary-500/20 hover:bg-primary-500/30 rounded-md text-xs text-primary-400 transition-colors">
                              Continue
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
