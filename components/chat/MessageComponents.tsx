'use client';

import { motion } from 'framer-motion';

// ============================================================================
// Typing Indicator
// ============================================================================
export function TypingIndicator() {
  return (
    <div className="flex gap-1.5 px-5 py-4 bg-surface-800/50 rounded-2xl rounded-tl-sm w-fit">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 bg-primary-500 rounded-full"
          animate={{ scale: [0.8, 1, 0.8], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Vendor Card
// ============================================================================
export function VendorCard({ vendor, onClick }: { vendor: any; onClick?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-surface-800/30 border border-surface-700/50 rounded-xl cursor-pointer hover:bg-primary-500/5 hover:border-primary-500/30 transition-all"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{vendor.logo || '🏢'}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-surface-100">{vendor.name}</span>
            {vendor.verified && <span className="text-[10px] text-emerald-400">✓ Verified</span>}
          </div>
        </div>
        <span className="text-amber-400 text-sm">
          {'★'.repeat(Math.floor(vendor.rating || 0))} {vendor.rating?.toFixed(1) || 'N/A'}
        </span>
      </div>
      <div className="text-xs text-surface-500">
        <span>⚡ {vendor.responseTime || 'Quick'} response</span>
        <span className="mx-2">•</span>
        <span>{vendor.specialty || 'General'}</span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Quote Comparison Table
// ============================================================================
export function QuoteTable({ quotes, onSelect }: { quotes: any[]; onSelect: (quote: any) => void }) {
  return (
    <div className="bg-surface-900/50 border border-surface-700/50 rounded-xl overflow-hidden">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_100px] gap-3 px-4 py-3 bg-surface-800/30 text-xs text-surface-500 font-medium uppercase tracking-wide">
        <span>Vendor</span>
        <span>Unit Price</span>
        <span>Total</span>
        <span>Delivery</span>
        <span>Warranty</span>
        <span></span>
      </div>
      {quotes.map((quote, i) => (
        <motion.div
          key={quote.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_100px] gap-3 px-4 py-3 items-center border-t border-surface-700/30 text-sm ${
            quote.isRecommended ? 'bg-emerald-500/5' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-surface-200">{quote.vendor?.name || quote.vendorName}</span>
            {quote.isRecommended && (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-semibold">
                Best Value
              </span>
            )}
          </div>
          <span className="text-surface-300">${quote.unitPrice?.toFixed(2)}</span>
          <span className="text-primary-400 font-semibold">${quote.totalPrice?.toLocaleString()}</span>
          <span className="text-surface-400">{quote.deliveryDays} days</span>
          <span className="text-surface-400">{quote.warranty}</span>
          <button
            onClick={() => onSelect(quote)}
            className="px-3 py-1.5 bg-primary-500/20 border border-primary-500/30 rounded-md text-primary-300 text-xs font-medium hover:bg-primary-500/30 transition-colors"
          >
            Select
          </button>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================================
// Negotiation Progress Card
// ============================================================================
export function NegotiationCard({ negotiation }: { negotiation: any }) {
  const savings = negotiation.originalPrice - negotiation.currentPrice;
  const targetSavings = negotiation.originalPrice - negotiation.targetPrice;
  const progress = targetSavings > 0 ? Math.min((savings / targetSavings) * 100, 100) : 0;

  return (
    <div className="bg-surface-900/50 border border-surface-700/50 rounded-xl p-5">
      <div className="flex justify-between items-center mb-5">
        <span className="font-semibold text-surface-100">🤝 Negotiating with {negotiation.vendor?.name}</span>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          negotiation.status === 'ACCEPTED' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'
        }`}>
          {negotiation.status === 'ACCEPTED' ? 'Accepted' : 'In Progress'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 mb-5 p-4 bg-surface-800/30 rounded-lg">
        <div className="text-center">
          <span className="text-[10px] text-surface-500 uppercase tracking-wide block mb-1">Original</span>
          <span className="text-lg font-bold text-surface-500 line-through">${negotiation.originalPrice?.toLocaleString()}</span>
        </div>
        <span className="text-surface-600">→</span>
        <div className="text-center">
          <span className="text-[10px] text-surface-500 uppercase tracking-wide block mb-1">Current</span>
          <span className="text-xl font-bold text-emerald-400">${negotiation.currentPrice?.toLocaleString()}</span>
        </div>
        <span className="text-surface-600">→</span>
        <div className="text-center">
          <span className="text-[10px] text-surface-500 uppercase tracking-wide block mb-1">Target</span>
          <span className="text-lg font-bold text-primary-400">${negotiation.targetPrice?.toLocaleString()}</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="h-2 bg-surface-700/50 rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
          />
        </div>
        <span className="text-sm text-emerald-400">💰 ${savings.toLocaleString()} saved so far</span>
      </div>

      {negotiation.rounds && negotiation.rounds.length > 0 && (
        <div className="border-t border-surface-700/30 pt-4 space-y-2">
          {negotiation.rounds.slice(-3).map((round: any, i: number) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="text-surface-600 min-w-[70px]">Round {round.round}</span>
              <span className="text-surface-400">{round.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Contract Summary Card
// ============================================================================
export function ContractCard({ 
  contract, 
  onApprove, 
  onRequestChanges 
}: { 
  contract: any;
  onApprove: () => void;
  onRequestChanges: () => void;
}) {
  const items = Array.isArray(contract.items) ? contract.items : [];
  
  return (
    <div className="bg-surface-900/50 border border-surface-700/50 rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 p-5 bg-surface-800/30 border-b border-surface-700/30">
        <span className="text-3xl">📄</span>
        <div className="flex-1">
          <h4 className="font-semibold text-surface-100">Purchase Agreement</h4>
          <span className="text-xs text-surface-500">Contract #{contract.contractNumber || contract.id}</span>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400">
          Pending Review
        </span>
      </div>

      <div className="p-5 space-y-3">
        <div className="flex justify-between py-2 border-b border-surface-700/20">
          <span className="text-surface-500 text-sm">Vendor</span>
          <span className="text-sm font-medium text-surface-200">{contract.vendor?.name}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-surface-700/20">
          <span className="text-surface-500 text-sm">Total Value</span>
          <span className="text-base font-medium text-emerald-400">${contract.totalValue?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-surface-700/20">
          <span className="text-surface-500 text-sm">Payment Terms</span>
          <span className="text-sm font-medium text-surface-200">{contract.paymentTerms}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-surface-700/20">
          <span className="text-surface-500 text-sm">Delivery Date</span>
          <span className="text-sm font-medium text-surface-200">
            {contract.deliveryDate ? new Date(contract.deliveryDate).toLocaleDateString() : 'TBD'}
          </span>
        </div>
        <div className="flex justify-between py-2">
          <span className="text-surface-500 text-sm">Warranty</span>
          <span className="text-sm font-medium text-surface-200">{contract.warranty}</span>
        </div>
      </div>

      <div className="flex gap-3 p-4 bg-surface-800/20 border-t border-surface-700/30">
        <button
          onClick={onRequestChanges}
          className="flex-1 px-4 py-3 border border-surface-600 rounded-lg text-surface-400 text-sm font-medium hover:bg-surface-800/50 transition-colors"
        >
          Request Changes
        </button>
        <button
          onClick={onApprove}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-600 to-primary-500 rounded-lg text-white text-sm font-medium hover:shadow-lg hover:shadow-primary-500/25 transition-all"
        >
          Approve & Generate PO
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Purchase Order Card
// ============================================================================
export function PurchaseOrderCard({ po }: { po: any }) {
  const items = Array.isArray(po.items) ? po.items : [];
  
  return (
    <div className="bg-surface-50 rounded-xl overflow-hidden text-surface-900 max-w-lg">
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white p-6 text-center relative">
        <span className="absolute top-3 right-3 text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">
          ✓ GENERATED
        </span>
        <h3 className="text-sm font-normal opacity-90 mb-1">Purchase Order</h3>
        <span className="text-2xl font-bold">{po.poNumber}</span>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-dashed border-surface-300">
          <div>
            <span className="text-xs text-surface-500 block mb-1">Vendor</span>
            <span className="font-medium">{po.vendor?.name}</span>
          </div>
          <div>
            <span className="text-xs text-surface-500 block mb-1">Date</span>
            <span className="font-medium">{new Date(po.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="col-span-2">
            <span className="text-xs text-surface-500 block mb-1">Ship To</span>
            <span className="text-sm">{po.shipToCompany}, {po.shipToStreet}, {po.shipToCity}, {po.shipToState} {po.shipToZip}</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between py-4 text-lg font-bold">
            <span>Total Amount</span>
            <span>${po.total?.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 px-3 py-2 bg-surface-100 rounded-lg text-xs font-medium hover:bg-surface-200 transition-colors">
            📧 Email
          </button>
          <button className="flex-1 px-3 py-2 bg-surface-100 rounded-lg text-xs font-medium hover:bg-surface-200 transition-colors">
            📥 Download
          </button>
          <button className="flex-1 px-3 py-2 bg-surface-100 rounded-lg text-xs font-medium hover:bg-surface-200 transition-colors">
            📋 Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Placeholder components (simplified for space)
// ============================================================================
export function BudgetImpact({ budget, amount }: { budget: any; amount: number }) {
  return <div className="text-sm text-surface-400">Budget impact: ${amount.toLocaleString()}</div>;
}

export function RiskAssessment({ risk }: { risk: any }) {
  return <div className="text-sm text-surface-400">Risk: {risk?.overall || 'Low'}</div>;
}

export function MarketIntelligence({ market }: { market: any }) {
  return <div className="text-sm text-surface-400">Market avg: ${market?.avgPrice || 'N/A'}</div>;
}

export function ApprovalWorkflow({ chain }: { chain: any[] }) {
  return <div className="text-sm text-surface-400">Approval workflow: {chain?.length || 0} steps</div>;
}

export function DeliveryTracker({ po }: { po: any }) {
  return <div className="text-sm text-surface-400">Delivery: {po?.status || 'Pending'}</div>;
}

export function ActionButtons({ actions, onAction }: { actions: any[]; onAction: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action: any) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            action.primary
              ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white'
              : 'bg-surface-800/50 border border-surface-700 text-surface-300'
          }`}
        >
          {action.icon && <span className="mr-2">{action.icon}</span>}
          {action.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Suggestions
// ============================================================================
export function Suggestions({ suggestions, onSelect }: { suggestions: string[]; onSelect: (s: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {suggestions.map((suggestion) => (
        <motion.button
          key={suggestion}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(suggestion)}
          className="px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-300 text-sm hover:bg-primary-500/20 hover:border-primary-500/30 transition-colors"
        >
          {suggestion}
        </motion.button>
      ))}
    </div>
  );
}
