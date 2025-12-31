import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: string;
  type: string;
  content?: string;
  isUser: boolean;
  data?: any;
  timestamp: Date;
}

export interface AppState {
  requestId: string | null;
  messages: Message[];
  isProcessing: boolean;
  systemStatus: string | null;
  stage: string;

  setRequestId: (id: string | null) => void;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  clearMessages: () => void;
  setIsProcessing: (processing: boolean) => void;
  setSystemStatus: (status: string | null) => void;
  setStage: (stage: string) => void;
}

export const useStore = create<AppState>((set) => ({
  requestId: null,
  messages: [],
  isProcessing: false,
  systemStatus: null,
  stage: 'initial',

  setRequestId: (id) => set({ requestId: id }),

  addMessage: (message) => {
    const id = uuidv4();
    const newMessage: Message = {
      ...message,
      id,
      timestamp: new Date(),
    };
    set((state) => ({ messages: [...state.messages, newMessage] }));
    return id;
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  },

  removeMessage: (id) => {
    set((state) => ({
      messages: state.messages.filter((msg) => msg.id !== id),
    }));
  },

  clearMessages: () => set({ messages: [], requestId: null, stage: 'initial' }),

  setIsProcessing: (processing) => set({ isProcessing: processing }),

  setSystemStatus: (status) => set({ systemStatus: status }),
  
  setStage: (stage) => set({ stage }),
}));

// API functions
export async function sendMessage(message: string, requestId: string | null): Promise<{
  requestId: string;
  message: string;
  action: string;
  data: any;
  stage: string;
  suggestions: string[];
}> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, requestId }),
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return response.json();
}

export async function getConversation(requestId: string) {
  const response = await fetch(`/api/chat?requestId=${requestId}`);
  
  if (!response.ok) {
    throw new Error('Failed to get conversation');
  }

  return response.json();
}
