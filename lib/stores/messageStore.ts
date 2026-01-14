import { create } from 'zustand';
import { Message } from '@/types';

interface MessageStore {
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  lastMessageId: string | null;
  
  // Actions
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  replaceOptimisticMessage: (tempId: string, realMessage: Message) => void;
  removeMessage: (messageId: string) => void;
  setIsLoading: (loading: boolean) => void;
  setIsConnected: (connected: boolean) => void;
  setLastMessageId: (id: string | null) => void;
  clearMessages: () => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  messages: [],
  isLoading: true,
  isConnected: false,
  lastMessageId: null,

  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => {
    // Avoid duplicates
    if (state.messages.some(m => m.id === message.id)) {
      return state;
    }
    return { messages: [...state.messages, message] };
  }),

  replaceOptimisticMessage: (tempId, realMessage) => set((state) => ({
    messages: state.messages.map(m => m.id === tempId ? realMessage : m),
    lastMessageId: realMessage.id,
  })),

  removeMessage: (messageId) => set((state) => ({
    messages: state.messages.filter(m => m.id !== messageId),
  })),

  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setLastMessageId: (id) => set({ lastMessageId: id }),
  clearMessages: () => set({ messages: [], lastMessageId: null }),
}));
