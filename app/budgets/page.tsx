'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Budget {
  id: string;
  name: string;
  department: string;
  fiscalYear: number;
  totalAmount: number;
  spentAmount: number;
  committedAmount: number;
  alertThreshold: number;
  status: string;
  utilization: number;
  remaining: number;
  isOverThreshold: boolean;
  requestCount: number;
  manager: { id: string; name: string; email: string };
}

export default function BudgetsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBudget, setNewBudget] = useState({
    name: '',
    department: '',
    totalAmount: '',
    alertThreshold: '80',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchBudgets();
    }
  }, [session]);

  const fetchBudgets = async () => {
    try {
      const res = await fetch('/api/budgets');
      if (res.ok) {
        const data = await res.json();
        setBudgets(data);
      }
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBudget.name,
          department: newBudget.department,
          totalAmount: parseFloat(newBudget.totalAmount),
          alertThreshold: parseFloat(newBudget.alertThreshold),
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewBudget({ name: '', department: '', totalAmount: '', alertThreshold: '80' });
        fetchBudgets();
      }
    } catch (error) {
      console.error('Error creating budget:', error);
    }
  };

  const userRole = (session?.user as any)?.role;
  const canManageBudgets = ['ADMIN', 'FINANCE'].includes(userRole);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-surface-950 to-surface-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-surface-500">Loading budgets...</p>
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
              <Link href="/dashboard" className="px-4 py-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50">
                Dashboard
              </Link>
              <Link href="/" className="px-4 py-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50">
                New Request
              </Link>
              <Link href="/budgets" className="px-4 py-2 rounded-lg bg-primary-500/10 text-primary-400 font-medium">
                Budgets
              </Link>
              <Link href="/analytics" className="px-4 py-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50">
                Analytics
              </Link>
            </nav>
          </div>

          {canManageBudgets && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 rounded-lg text-white text-sm font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
            >
              + New Budget
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-surface-100 mb-8">Budget Management</h1>

        {/* Budget Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.length === 0 ? (
            <div className="col-span-full text-center py-12 text-surface-500">
              <div className="text-4xl mb-2">💰</div>
              No budgets found. {canManageBudgets && 'Create your first budget to get started.'}
            </div>
          ) : (
            budgets.map((budget, i) => (
              <motion.div
                key={budget.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`bg-surface-900/50 border rounded-xl p-6 ${
                  budget.isOverThreshold ? 'border-amber-500/50' : 'border-surface-800'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-surface-100">{budget.name}</h3>
                    <p className="text-sm text-surface-500">{budget.department}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    budget.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                    budget.status === 'FROZEN' ? 'bg-blue-500/20 text-blue-400' :
                    budget.status === 'EXHAUSTED' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {budget.status}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-surface-500">Utilization</span>
                    <span className={budget.isOverThreshold ? 'text-amber-400' : 'text-surface-400'}>
                      {budget.utilization.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        budget.utilization >= 100 ? 'bg-red-500' :
                        budget.isOverThreshold ? 'bg-amber-500' :
                        'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(budget.utilization, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-surface-500 mb-1">Spent</div>
                    <div className="text-lg font-semibold text-surface-200">
                      ${budget.spentAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500 mb-1">Committed</div>
                    <div className="text-lg font-semibold text-amber-400">
                      ${budget.committedAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500 mb-1">Remaining</div>
                    <div className="text-lg font-semibold text-emerald-400">
                      ${budget.remaining.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500 mb-1">Total Budget</div>
                    <div className="text-lg font-semibold text-surface-300">
                      ${budget.totalAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-surface-800">
                  <div className="text-xs text-surface-500">
                    {budget.requestCount} requests • FY{budget.fiscalYear}
                  </div>
                  <div className="text-xs text-surface-500">
                    Manager: {budget.manager.name}
                  </div>
                </div>

                {budget.isOverThreshold && (
                  <div className="mt-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
                    ⚠️ Budget has exceeded {budget.alertThreshold}% threshold
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </main>

      {/* Create Budget Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-900 border border-surface-800 rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-semibold text-surface-100 mb-6">Create New Budget</h2>
            
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Budget Name
                </label>
                <input
                  type="text"
                  value={newBudget.name}
                  onChange={(e) => setNewBudget({ ...newBudget, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-100 outline-none focus:border-primary-500/50"
                  placeholder="Q1 2025 IT Budget"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Department
                </label>
                <select
                  value={newBudget.department}
                  onChange={(e) => setNewBudget({ ...newBudget, department: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-100 outline-none focus:border-primary-500/50"
                >
                  <option value="">Select department</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Operations">Operations</option>
                  <option value="Finance">Finance</option>
                  <option value="HR">Human Resources</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Total Amount ($)
                </label>
                <input
                  type="number"
                  value={newBudget.totalAmount}
                  onChange={(e) => setNewBudget({ ...newBudget, totalAmount: e.target.value })}
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-100 outline-none focus:border-primary-500/50"
                  placeholder="100000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-300 mb-2">
                  Alert Threshold (%)
                </label>
                <input
                  type="number"
                  value={newBudget.alertThreshold}
                  onChange={(e) => setNewBudget({ ...newBudget, alertThreshold: e.target.value })}
                  required
                  min="1"
                  max="100"
                  className="w-full px-4 py-3 bg-surface-800/50 border border-surface-700 rounded-lg text-surface-100 outline-none focus:border-primary-500/50"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 border border-surface-700 rounded-lg text-surface-400 hover:bg-surface-800/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-500 rounded-lg text-white font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
                >
                  Create Budget
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
