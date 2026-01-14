import { useEffect, useRef, useCallback } from 'react';
import { useMessageStore } from '@/lib/stores/messageStore';

interface UseSSEOptions {
  roomId: string;
  enabled: boolean;
}

export function useSSE({ roomId, enabled }: UseSSEOptions) {
  const {
    setMessages,
    addMessage,
    replaceOptimisticMessage,
    setIsLoading,
    setIsConnected,
    setLastMessageId,
    lastMessageId,
  } = useMessageStore();

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isSubscribedRef = useRef(true);
  const maxReconnectAttempts = 10;
  const connectSSERef = useRef<(() => void) | null>(null);

  const connectSSE = useCallback(() => {
    if (!enabled || !roomId || !isSubscribedRef.current) return;

    if (reconnectAttemptsRef.current === 0) {
      setIsLoading(true);
      setMessages([]);
    }

    const eventSource = new EventSource(`/api/sse?roomId=${roomId}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onerror = () => {
      setIsConnected(false);

      if (eventSource.readyState === EventSource.CLOSED) {
        eventSource.close();

        if (isSubscribedRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connectSSERef.current?.();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setIsLoading(false);
        }
      }
    };

    eventSource.onmessage = (event) => {
      try {
        if (event.data === ':heartbeat' || event.data.trim() === '') {
          return;
        }

        const data = JSON.parse(event.data);

        if (data.type === 'initial') {
          setMessages(data.messages || []);
          setIsLoading(false);
          if (data.messages && data.messages.length > 0) {
            setLastMessageId(data.messages[data.messages.length - 1].id);
          }
        } else if (data.type === 'error') {
          setIsLoading(false);
        } else if (data.id && data.text && data.room_id === roomId) {
          if (data.id === lastMessageId) {
            return;
          }

          // Check if this is the same message we just sent optimistically
          const now = Date.now();
          const currentMessages = useMessageStore.getState().messages;
          const optimisticMatch = currentMessages.find(m => 
            m.id.startsWith('temp-') &&
            m.text === data.text &&
            m.username === data.username &&
            Math.abs(now - new Date(m.created_at).getTime()) < 5000
          );

          if (optimisticMatch) {
            replaceOptimisticMessage(optimisticMatch.id, data);
          } else {
            // Check for duplicates by ID
            if (!currentMessages.some(m => m.id === data.id)) {
              addMessage(data);
              setLastMessageId(data.id);
            }
          }
        }
      } catch {
        // Silent fail for parse errors
      }
    };
  }, [roomId, enabled, lastMessageId, setMessages, addMessage, replaceOptimisticMessage, setIsLoading, setIsConnected, setLastMessageId]);

  useEffect(() => {
    // Store connectSSE in ref for recursive calls
    connectSSERef.current = connectSSE;
  }, [connectSSE]);

  useEffect(() => {
    if (!enabled || !roomId) return;

    isSubscribedRef.current = true;
    connectSSE();

    return () => {
      isSubscribedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setIsConnected(false);
    };
  }, [enabled, roomId, connectSSE, setIsConnected]);
}
