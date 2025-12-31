'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface RequestDetail {
  id: string;
  requestNumber: string;
  status: string;
  stage: string;
  category: string;
  description: string;
  quantity: number;
  budget: number;
  urgency: string;
  deliveryDate: string;
  deliveryLocation: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string; department: string };
  quotes: Array<{
    id: string;
    quoteNumber: string;
    vendor: { id: string; name: string; rating: number };
    unitPrice: number;
    totalPrice: number;
    deliveryDays: number;
    warranty: string;
    status: string;
    isRecommended: boolean;
  }>;
  negotiation: {
    id: string;
    status: string;
    originalPrice: number;
    currentPrice: number;
    targetPrice: number;
    vendor: { name: string };
    rounds: Array<{ round: number; ourOffer: number; vendorResponse: number; message: string; status: string }>;
  } | null;
  contract: {
    id: string;
    contractNumber: string;
    status: string;
    totalValue: number;
    paymentTerms: string;
    deliveryDate: string;
    terms: string[];
    vendor: { name: string };
  } | null;
  purchaseOrder: {
    id: string;
    poNumber: string;
    status: string;
    total: number;
    deliveryDate: string;
    trackingNumber: string;
    vendor: { name: string };
  } | null;
  approvals: Array<{
    id: string;
    step: number;
    role: string;
    status: string;
    comments: string;
    user: { name: string; email: string };
    approvedAt: string;
  }>;
  attachments: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    createdAt: string;
  }>;
  messages: Array<{
    id: string;
    type: string;
    content: string;
    isUser: boolean;
    createdAt: string;
  }>;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400',
  PENDING: 'bg-amber-500/20 text-amber-400',
  APPROVED: 'bg-emerald-500/20 text-emerald-400',
  REJECTED: 'bg-red-500/20 text-red-400',
  COMPLETED: 'bg-green-500/20 text-green-400',
};

export default function RequestDetailPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'timeline' | 'files'>('overview');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (session && requestId) {
      fetchRequest();
    }
  }, [session, requestId]);

  const fetchRequest = async () => {
    try {
      const res = await fetch(`/api/requests/${requestId}`);
      if (res.ok) {
        const data = await res.json();
        setRequest(data);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approvalId: string, action: 'approve' | 'reject', comments?: string) => {
    try {
      const res = await fetch('/api/approvals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId, action, comments }),
      });

      if (res.ok) {
        fetchRequest();
      }
    } catch (error) {
      console.error('Error handling approval:', error);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-surface-950 to-surface-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-surface-500">Loading request...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  const userId = (session?.user as any)?.id;
  const pendingApproval = request.approvals.find(
    (a) => a.user && a.status === 'PENDING'
  );
  const canApprove = pendingApproval && pendingApproval.user?.email === session?.user?.email;

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-950 to-surface-900">
      {/* Header */}
      <header className="border-b border-surface-800 bg-surface-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-surface-400 hover:text-surface-200">
              ← Back
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-surface-100">
                {request.requestNumber}
              </h1>
              <p className="text-sm text-surface-500">{request.description}</p>
            </div>
          </div>

          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[request.status] || 'bg-gray-500/20 text-gray-400'}`}>
            {request.status.replace(/_/g, ' ')}
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-surface-800 pb-4">
          {['overview', 'quotes', 'timeline', 'files'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Request Details */}
              <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-surface-100 mb-4">Request Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-surface-500 mb-1">Category</div>
                    <div className="text-surface-200 capitalize">{request.category || 'General'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500 mb-1">Quantity</div>
                    <div className="text-surface-200">{request.quantity || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500 mb-1">Budget</div>
                    <div className="text-surface-200">${(request.budget || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500 mb-1">Urgency</div>
                    <div className="text-surface-200">{request.urgency}</div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500 mb-1">Delivery Date</div>
                    <div className="text-surface-200">
                      {request.deliveryDate ? format(new Date(request.deliveryDate), 'MMM d, yyyy') : 'Flexible'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-surface-500 mb-1">Requester</div>
                    <div className="text-surface-200">{request.user.name}</div>
                  </div>
                </div>
              </div>

              {/* Negotiation */}
              {request.negotiation && (
                <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-surface-100 mb-4">Negotiation</h3>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-surface-400">Vendor: {request.negotiation.vendor.name}</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      request.negotiation.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {request.negotiation.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-surface-800/30 rounded-lg">
                      <div className="text-xs text-surface-500 mb-1">Original</div>
                      <div className="text-lg font-semibold text-surface-400 line-through">
                        ${request.negotiation.originalPrice.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                      <div className="text-xs text-surface-500 mb-1">Current</div>
                      <div className="text-lg font-semibold text-emerald-400">
                        ${request.negotiation.currentPrice.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center p-3 bg-surface-800/30 rounded-lg">
                      <div className="text-xs text-surface-500 mb-1">Savings</div>
                      <div className="text-lg font-semibold text-primary-400">
                        ${(request.negotiation.originalPrice - request.negotiation.currentPrice).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contract */}
              {request.contract && (
                <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-surface-100 mb-4">Contract</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-surface-500 mb-1">Contract #</div>
                      <div className="text-surface-200">{request.contract.contractNumber}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-500 mb-1">Value</div>
                      <div className="text-emerald-400 font-semibold">${request.contract.totalValue.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-500 mb-1">Payment Terms</div>
                      <div className="text-surface-200">{request.contract.paymentTerms}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-500 mb-1">Status</div>
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColors[request.contract.status]}`}>
                        {request.contract.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase Order */}
              {request.purchaseOrder && (
                <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-surface-100 mb-4">Purchase Order</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-surface-500 mb-1">PO #</div>
                      <div className="text-surface-200 font-mono">{request.purchaseOrder.poNumber}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-500 mb-1">Total</div>
                      <div className="text-emerald-400 font-semibold">${request.purchaseOrder.total.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-surface-500 mb-1">Status</div>
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColors[request.purchaseOrder.status]}`}>
                        {request.purchaseOrder.status}
                      </span>
                    </div>
                    {request.purchaseOrder.trackingNumber && (
                      <div>
                        <div className="text-xs text-surface-500 mb-1">Tracking</div>
                        <div className="text-surface-200">{request.purchaseOrder.trackingNumber}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Approval Status */}
              <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-surface-100 mb-4">Approvals</h3>
                {request.approvals.length === 0 ? (
                  <p className="text-surface-500 text-sm">No approvals required yet</p>
                ) : (
                  <div className="space-y-3">
                    {request.approvals.map((approval) => (
                      <div key={approval.id} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          approval.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                          approval.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                          'bg-surface-700 text-surface-400'
                        }`}>
                          {approval.status === 'APPROVED' ? '✓' : approval.status === 'REJECTED' ? '✗' : approval.step}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-surface-200">{approval.user?.name || approval.role}</div>
                          <div className="text-xs text-surface-500">{approval.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {canApprove && pendingApproval && (
                  <div className="mt-4 pt-4 border-t border-surface-800">
                    <p className="text-sm text-surface-400 mb-3">Your approval is required</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproval(pendingApproval.id, 'approve')}
                        className="flex-1 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-500/30"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproval(pendingApproval.id, 'reject')}
                        className="flex-1 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Activity */}
              <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-surface-100 mb-4">Activity</h3>
                <div className="space-y-3 text-sm">
                  <div className="text-surface-500">
                    Created {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
                  </div>
                  <div className="text-surface-500">
                    Updated {format(new Date(request.updatedAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quotes' && (
          <div className="bg-surface-900/50 border border-surface-800 rounded-xl overflow-hidden">
            {request.quotes.length === 0 ? (
              <div className="p-12 text-center text-surface-500">
                <div className="text-4xl mb-2">📋</div>
                No quotes received yet
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-800">
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Vendor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Delivery</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Warranty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {request.quotes.map((quote) => (
                    <tr key={quote.id} className={`hover:bg-surface-800/30 ${quote.isRecommended ? 'bg-emerald-500/5' : ''}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-surface-200">{quote.vendor.name}</span>
                          {quote.isRecommended && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">Best</span>
                          )}
                        </div>
                        <div className="text-xs text-amber-400">★ {quote.vendor.rating}</div>
                      </td>
                      <td className="px-4 py-4 text-surface-300">${quote.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-4 text-primary-400 font-semibold">${quote.totalPrice.toLocaleString()}</td>
                      <td className="px-4 py-4 text-surface-400">{quote.deliveryDays} days</td>
                      <td className="px-4 py-4 text-surface-400">{quote.warranty}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${statusColors[quote.status]}`}>
                          {quote.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-6">
            <div className="space-y-4">
              {request.messages.slice(-20).map((msg, i) => (
                <div key={msg.id} className={`flex gap-3 ${msg.isUser ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    msg.isUser ? 'bg-primary-500/20 text-primary-400' : 'bg-surface-700 text-surface-400'
                  }`}>
                    {msg.isUser ? 'U' : 'AI'}
                  </div>
                  <div className={`max-w-[70%] px-4 py-2 rounded-lg ${
                    msg.isUser ? 'bg-primary-500/20 text-primary-100' : 'bg-surface-800 text-surface-200'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs text-surface-500 mt-1">
                      {format(new Date(msg.createdAt), 'h:mm a')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="bg-surface-900/50 border border-surface-800 rounded-xl p-6">
            {request.attachments.length === 0 ? (
              <div className="text-center py-8 text-surface-500">
                <div className="text-4xl mb-2">📁</div>
                No files attached
              </div>
            ) : (
              <div className="space-y-2">
                {request.attachments.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-surface-800/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📄</span>
                      <div>
                        <div className="text-sm text-surface-200">{file.originalName}</div>
                        <div className="text-xs text-surface-500">
                          {(file.size / 1024).toFixed(1)} KB • {format(new Date(file.createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-surface-700 rounded text-xs text-surface-300 hover:bg-surface-600">
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
