import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAppDispatch } from './useStore';
import { addEvent } from '../store/slices/feedSlice';
import { fetchMetrics } from '../store/slices/metricsSlice';

// Make sure to populate these in frontend/.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'REPLACE_WITH_YOUR_SUPABASE_URL') {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export const useSupabaseRealtime = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!supabase) {
      console.warn('Supabase URL or Anon Key is missing. Realtime updates are disabled.');
      return;
    }

    console.log('Connecting to Supabase Realtime...');

    // Subscribe to payment_events
    const paymentEventsSub = supabase
      .channel('payment_events_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payment_events' },
        (payload) => {
          const row = payload.new;
          dispatch(addEvent({
            id: Date.now().toString() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            module: 'GATEWAY',
            type: 'warning',
            content: `New payment failure detected: ₹${(row.amount / 100).toFixed(2)} (${row.failure_cause})`,
          }));
          dispatch(fetchMetrics());
        }
      )
      .subscribe();

    // Subscribe to recovery_actions
    const recoveryActionsSub = supabase
      .channel('recovery_actions_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'recovery_actions' },
        (payload) => {
          const row = payload.new;
          
          let type: 'success' | 'danger' | 'warning' | 'info' = 'info';
          if (row.outcome === 'PAYMENT_MADE') type = 'success';
          else if (row.outcome === 'BLOCKED') type = 'danger';
          else if (row.outcome === 'RETRY_SCHEDULED') type = 'warning';

          dispatch(addEvent({
            id: Date.now().toString() + Math.random(),
            timestamp: new Date().toLocaleTimeString(),
            module: row.module || 'UNKNOWN',
            type: type,
            content: `Action taken: ${row.action_type}. ${row.agent_reasoning}`,
          }));
          dispatch(fetchMetrics());
        }
      )
      .subscribe();

    // Subscribe to ptp_records
    const ptpRecordsSub = supabase
      .channel('ptp_records_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ptp_records' },
        () => {
          dispatch(fetchMetrics());
        }
      )
      .subscribe();

    // Subscribe to b2b_invoices
    const b2bInvoicesSub = supabase
      .channel('b2b_invoices_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'b2b_invoices' },
        () => {
          dispatch(fetchMetrics());
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(paymentEventsSub);
      supabase?.removeChannel(recoveryActionsSub);
      supabase?.removeChannel(ptpRecordsSub);
      supabase?.removeChannel(b2bInvoicesSub);
    };
  }, [dispatch]);
};
