'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore, sendMessage } from '@/lib/store';
import {
  TypingIndicator,
  VendorCard,
  QuoteTable,
  NegotiationCard,
  BudgetImpact,
  RiskAssessment,
  MarketIntelligence,
  ContractCard,
  PurchaseOrderCard,
  ApprovalWorkflow,
  DeliveryTracker,
  ActionButtons,
  Suggestions,
} from './MessageComponents';

// Message renderer
function ChatMessage({ 
  message, 
  onAction 
}: { 
  message: any;
  onAction: (actionId: string, data?: any) => void;
}) {
  if (message.type === 'thinking') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="flex gap-3"
      >
        <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
          ⚡
        </div>
        <div className="flex flex-col gap-3">
          <TypingIndicator />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${message.isUser ? 'flex-row-reverse' : ''}`}
    >
      {!message.isUser && (
        <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
          ⚡
        </div>
      )}
      
      <div className={`flex flex-col gap-3 max-w-[85%] ${message.isUser ? 'items-end' : ''}`}>
        {message.content && (
          <div className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed ${
            message.isUser
              ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-tr-sm'
              : 'bg-surface-800/50 text-surface-200 rounded-tl-sm'
          }`}>
            {message.content}
          </div>
        )}

        {/* Render data components based on message type */}
        {message.type === 'search_vendors' && message.data?.vendors && (
          <div className="space-y-2 w-full">
            {message.data.vendors.slice(0, 5).map((vendor: any) => (
              <VendorCard key={vendor.id} vendor={vendor} onClick={() => onAction('select_vendor', vendor)} />
            ))}
          </div>
        )}

        {message.type === 'send_rfq' && message.data?.quotes && (
          <QuoteTable quotes={message.data.quotes} onSelect={(quote) => onAction('select_quote', quote)} />
        )}

        {(message.type === 'start_negotiation' || message.type === 'negotiation') && message.data?.negotiation && (
          <NegotiationCard negotiation={message.data.negotiation} />
        )}

        {message.type === 'generate_contract' && message.data?.contract && (
          <ContractCard
            contract={message.data.contract}
            onApprove={() => onAction('approve_contract')}
            onRequestChanges={() => onAction('request_changes')}
          />
        )}

        {message.type === 'create_po' && message.data?.purchaseOrder && (
          <PurchaseOrderCard po={message.data.purchaseOrder} />
        )}

        {message.data?.suggestions && message.data.suggestions.length > 0 && (
          <Suggestions suggestions={message.data.suggestions} onSelect={(s) => onAction('suggestion', s)} />
        )}
      </div>
    </motion.div>
  );
}

// Status bar component
function StatusBar({ status }: { status: string | null }) {
  if (!status) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 bg-primary-500/95 backdrop-blur-sm rounded-full text-white text-sm font-medium shadow-lg shadow-primary-500/30 z-50"
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
      </span>
      {status}
    </motion.div>
  );
}

// Main Chat component
export default function Chat() {
  const [input, setInput] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { 
    requestId,
    messages, 
    isProcessing, 
    systemStatus,
    addMessage, 
    removeMessage,
    setRequestId,
    setIsProcessing,
    setSystemStatus,
    setStage,
  } = useStore();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize conversation
  useEffect(() => {
    if (!initialized && messages.length === 0) {
      setInitialized(true);
      
      // Welcome message
      setTimeout(() => {
        addMessage({
          type: 'text',
          content: "Hi! I'm your procurement assistant. What do you need to purchase today?",
          isUser: false,
        });

        setSuggestions([
          "I need 40 office desks for our new floor",
          "Looking for 200 ergonomic chairs",
          "Need to order 50 laptops for engineering",
        ]);
      }, 500);
    }
  }, [initialized, messages.length, addMessage]);

  // Process user input
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    setSuggestions([]);
    
    // Add user message
    addMessage({
      type: 'text',
      content: userMessage,
      isUser: true,
    });

    setIsProcessing(true);

    // Show thinking indicator
    const thinkingId = addMessage({
      type: 'thinking',
      isUser: false,
    });

    try {
      setSystemStatus('Processing...');
      
      const response = await sendMessage(userMessage, requestId);
      
      removeMessage(thinkingId);
      setSystemStatus(null);
      
      // Update request ID if new
      if (response.requestId && response.requestId !== requestId) {
        setRequestId(response.requestId);
      }
      
      // Update stage
      if (response.stage) {
        setStage(response.stage);
      }
      
      // Add AI response
      addMessage({
        type: response.action || 'text',
        content: response.message,
        isUser: false,
        data: {
          ...response.data,
          suggestions: response.suggestions,
        },
      });
      
      // Update suggestions
      if (response.suggestions) {
        setSuggestions(response.suggestions);
      }
    } catch (error) {
      console.error('Error:', error);
      removeMessage(thinkingId);
      setSystemStatus(null);
      addMessage({
        type: 'text',
        content: "Sorry, I encountered an error. Please try again.",
        isUser: false,
      });
    }

    setIsProcessing(false);
    inputRef.current?.focus();
  };

  // Handle action button clicks
  const handleAction = async (actionId: string, data?: any) => {
    // Handle suggestion clicks
    if (actionId === 'suggestion' && typeof data === 'string') {
      setInput(data);
      inputRef.current?.focus();
      return;
    }

    // Handle other actions by sending as message
    let message = '';
    switch (actionId) {
      case 'select_quote':
        message = `I'd like to select the quote from ${data?.vendor?.name || 'this vendor'}`;
        break;
      case 'approve_contract':
        message = 'I approve the contract, please generate the purchase order';
        break;
      case 'request_changes':
        message = 'I need to request some changes to the contract';
        break;
      case 'select_vendor':
        message = `Let's go with ${data?.name || 'this vendor'}`;
        break;
      default:
        message = actionId;
    }

    if (message) {
      setInput(message);
      // Auto-submit
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      setTimeout(() => handleSubmit(fakeEvent), 100);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onAction={handleAction}
              />
            ))}
          </AnimatePresence>
          
          {/* Show suggestions */}
          {suggestions.length > 0 && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 ml-12"
            >
              <Suggestions suggestions={suggestions} onSelect={(s) => handleAction('suggestion', s)} />
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Status Bar */}
      <AnimatePresence>
        <StatusBar status={systemStatus} />
      </AnimatePresence>

      {/* Input */}
      <div className="border-t border-surface-800 bg-surface-950/80 backdrop-blur-xl p-5">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you need to purchase..."
              disabled={isProcessing}
              className="flex-1 px-5 py-4 bg-surface-800/50 border border-surface-700 rounded-xl text-surface-100 placeholder-surface-600 text-[15px] outline-none focus:border-primary-500/50 focus:bg-surface-800/80 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="px-7 py-4 bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl text-white font-medium text-[15px] hover:shadow-lg hover:shadow-primary-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Send
              <span>→</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
