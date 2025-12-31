'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

interface VendorData {
  id: string;
  name: string;
  email: string;
  rating: number;
  totalOrders: number;
  totalValue: number;
}

interface RFQ {
  id: string;
  requestNumber: string;
  description: string;
  quantity: number;
  category: string;
  deliveryDate: string;
  status: string;
  createdAt: string;
}

interface PO {
  id: string;
  poNumber: string;
  total: number;
  status: string;
  deliveryDate: string;
  createdAt: string;
}

export default function VendorPortalPage() {
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [orders, setOrders] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rfqs' | 'orders'>('rfqs');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/vendor-portal/auth');
      if (!res.ok) {
        router.push('/vendor-portal/login');
        return;
      }
      const data = await res.json();
      setVendor(data.vendor);
      fetchData();
    } catch (error) {
      router.push('/vendor-portal/login');
    }
  };

  const fetchData = async () => {
    try {
      const [rfqsRes, ordersRes] = await Promise.all([
        fetch('/api/vendor-portal/rfqs'),
        fetch('/api/vendor-portal/orders'),
      ]);

      if (rfqsRes.ok) {
        const data = await rfqsRes.json();
        setRfqs(data);
      }

      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-surface-950 to-surface-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">🏢</span>
          </div>
          <p className="text-surface-500">Loading vendor portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-950 to-surface-900">
      {/* Header */}
      <header className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-xl">🏢</span>
            </div>
            <div>
              <span className="text-xl font-semibold text-surface-100">
                {vendor?.name}
              </span>
              <span className="text-xs text-surface-500 block">Vendor Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-surface-400">Rating</div>
              <div className="text-amber-400">
                {'★'.repeat(Math.floor(vendor?.rating || 0))} {vendor?.rating?.toFixed(1)}
              </div>
            </div>
            <button
              onClick={() => {
                fetch('/api/vendor-portal/logout', { method: 'POST' });
                router.push('/vendor-portal/login');
              }}
              className="px-4 py-2 bg-surface-800 rounded-lg text-surface-400 text-sm hover:bg-surface-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-4">
            <div className="text-3xl mb-1">📋</div>
            <div className="text-2xl font-bold text-surface-100">{rfqs.length}</div>
            <div className="text-xs text-surface-500">Open RFQs</div>
          </div>
          <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-4">
            <div className="text-3xl mb-1">📦</div>
            <div className="text-2xl font-bold text-blue-400">{orders.filter(o => o.status === 'ACKNOWLEDGED').length}</div>
            <div className="text-xs text-surface-500">Active Orders</div>
          </div>
          <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-4">
            <div className="text-3xl mb-1">✅</div>
            <div className="text-2xl font-bold text-emerald-400">{vendor?.totalOrders || 0}</div>
            <div className="text-xs text-surface-500">Total Orders</div>
          </div>
          <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-4">
            <div className="text-3xl mb-1">💰</div>
            <div className="text-2xl font-bold text-surface-100">
              ${(vendor?.totalValue || 0).toLocaleString()}
            </div>
            <div className="text-xs text-surface-500">Total Revenue</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('rfqs')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'rfqs'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            Quote Requests ({rfqs.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            Purchase Orders ({orders.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'rfqs' ? (
          <div className="bg-surface-900/50 border border-surface-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Request #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Delivery By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {rfqs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-surface-500">
                      No quote requests at this time
                    </td>
                  </tr>
                ) : (
                  rfqs.map((rfq) => (
                    <tr key={rfq.id} className="hover:bg-surface-800/30">
                      <td className="px-4 py-4 text-sm text-surface-200">{rfq.requestNumber}</td>
                      <td className="px-4 py-4 text-sm text-surface-300">{rfq.description}</td>
                      <td className="px-4 py-4 text-sm text-surface-400">{rfq.quantity}</td>
                      <td className="px-4 py-4 text-sm text-surface-400">
                        {rfq.deliveryDate ? format(new Date(rfq.deliveryDate), 'MMM d, yyyy') : 'Flexible'}
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                          {rfq.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/vendor-portal/quotes/${rfq.id}`}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-md text-xs text-emerald-400 transition-colors"
                        >
                          Submit Quote
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-surface-900/50 border border-surface-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">PO #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Delivery Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-surface-500">
                      No purchase orders yet
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-800/30">
                      <td className="px-4 py-4 text-sm font-medium text-surface-200">{order.poNumber}</td>
                      <td className="px-4 py-4 text-sm text-emerald-400 font-medium">
                        ${order.total.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-surface-400">
                        {format(new Date(order.deliveryDate), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          order.status === 'DELIVERED' ? 'bg-green-500/20 text-green-400' :
                          order.status === 'SHIPPED' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/vendor-portal/orders/${order.id}`}
                          className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 rounded-md text-xs text-surface-300 transition-colors"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
