import { useEffect } from 'react';
import { useAppDispatch } from './useStore';
import { addEvent } from '../store/slices/feedSlice';

export const useReVaultSocket = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Determine WebSocket URL based on environment
    // Use ws:// for Go backend on port 8080
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('Connected to ReVault Go WebSocket backend');
    };

    socket.onmessage = (event: MessageEvent) => {
      const data = event.data;
      try {
        const parsed = JSON.parse(data);
        
        // Example handling of WebSocket event
        if (parsed.event === 'DEGRADATION_ALERT') {
          dispatch(addEvent({
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            module: 'DEGRADATION_WATCHDOG',
            type: 'danger',
            content: `Degradation Alert: ${parsed.segment?.bank} ${parsed.segment?.method} success rate dropped by ${(parsed.segment?.drop * 100).toFixed(1)}%.`
          }));
        } else if (parsed.event === 'RECOVERY_ACTION') {
          dispatch(addEvent({
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            module: parsed.module || 'UNKNOWN',
            type: 'success',
            content: `Action taken: ${parsed.action} for ${parsed.amount ? '₹' + (parsed.amount / 100).toFixed(2) : 'customer'}.`
          }));
        }

      } catch (e) {
        console.error('Failed to parse WebSocket message', e);
      }
    };

    return () => {
      socket.close();
    };
  }, [dispatch]);
};
