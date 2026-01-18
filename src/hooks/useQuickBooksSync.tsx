import { supabase } from "@/integrations/supabase/client";

interface QuickBooksHookOptions {
  companyId: string | null;
  enabled?: boolean;
}

// Hook to automatically push data to QuickBooks when connected
export const useQuickBooksSync = ({ companyId, enabled = true }: QuickBooksHookOptions) => {
  
  const pushInvoice = async (invoiceData: {
    client_id: string;
    invoice_number: string;
    amount: number;
    due_date: string;
    description?: string;
    notes?: string;
    line_items?: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      total: number;
    }>;
  }) => {
    if (!companyId || !enabled) return { success: false, skipped: true };

    try {
      // Check if QuickBooks is connected
      const { data: integration } = await supabase
        .from('company_integrations')
        .select('is_connected, sync_settings')
        .eq('company_id', companyId)
        .eq('provider', 'quickbooks')
        .single();

      if (!integration?.is_connected) {
        return { success: false, skipped: true, reason: 'not_connected' };
      }

      // Check if invoice sync is enabled
      const syncSettings = integration.sync_settings as any;
      if (syncSettings?.sync_invoices === false) {
        return { success: false, skipped: true, reason: 'sync_disabled' };
      }

      // Push to QuickBooks
      const { data, error } = await supabase.functions.invoke('quickbooks-push', {
        body: {
          company_id: companyId,
          action: 'create_invoice',
          data: invoiceData,
        },
      });

      if (error) throw error;

      return { success: true, quickbooks_id: data?.quickbooks_invoice_id };
    } catch (error) {
      console.error('Error pushing invoice to QuickBooks:', error);
      return { success: false, error };
    }
  };

  const pushPayment = async (paymentData: {
    invoice_id: string;
    amount: number;
    payment_method: string;
  }) => {
    if (!companyId || !enabled) return { success: false, skipped: true };

    try {
      const { data: integration } = await supabase
        .from('company_integrations')
        .select('is_connected, sync_settings')
        .eq('company_id', companyId)
        .eq('provider', 'quickbooks')
        .single();

      if (!integration?.is_connected) {
        return { success: false, skipped: true, reason: 'not_connected' };
      }

      const syncSettings = integration.sync_settings as any;
      if (syncSettings?.sync_payments === false) {
        return { success: false, skipped: true, reason: 'sync_disabled' };
      }

      const { data, error } = await supabase.functions.invoke('quickbooks-push', {
        body: {
          company_id: companyId,
          action: 'create_payment',
          data: paymentData,
        },
      });

      if (error) throw error;

      return { success: true, quickbooks_id: data?.quickbooks_payment_id };
    } catch (error) {
      console.error('Error pushing payment to QuickBooks:', error);
      return { success: false, error };
    }
  };

  const pushCustomer = async (customerData: {
    full_name: string;
    email: string;
    phone?: string;
    address?: string;
  }) => {
    if (!companyId || !enabled) return { success: false, skipped: true };

    try {
      const { data: integration } = await supabase
        .from('company_integrations')
        .select('is_connected, sync_settings')
        .eq('company_id', companyId)
        .eq('provider', 'quickbooks')
        .single();

      if (!integration?.is_connected) {
        return { success: false, skipped: true, reason: 'not_connected' };
      }

      const syncSettings = integration.sync_settings as any;
      if (syncSettings?.sync_customers === false) {
        return { success: false, skipped: true, reason: 'sync_disabled' };
      }

      const { data, error } = await supabase.functions.invoke('quickbooks-push', {
        body: {
          company_id: companyId,
          action: 'create_customer',
          data: customerData,
        },
      });

      if (error) throw error;

      return { success: true, quickbooks_id: data?.quickbooks_customer_id };
    } catch (error) {
      console.error('Error pushing customer to QuickBooks:', error);
      return { success: false, error };
    }
  };

  const pushExpense = async (expenseData: {
    amount: number;
    description: string;
    date?: string;
    category?: string;
  }) => {
    if (!companyId || !enabled) return { success: false, skipped: true };

    try {
      const { data: integration } = await supabase
        .from('company_integrations')
        .select('is_connected')
        .eq('company_id', companyId)
        .eq('provider', 'quickbooks')
        .single();

      if (!integration?.is_connected) {
        return { success: false, skipped: true, reason: 'not_connected' };
      }

      const { data, error } = await supabase.functions.invoke('quickbooks-push', {
        body: {
          company_id: companyId,
          action: 'create_expense',
          data: expenseData,
        },
      });

      if (error) throw error;

      return { success: true, quickbooks_id: data?.quickbooks_expense_id };
    } catch (error) {
      console.error('Error pushing expense to QuickBooks:', error);
      return { success: false, error };
    }
  };

  return {
    pushInvoice,
    pushPayment,
    pushCustomer,
    pushExpense,
  };
};

export default useQuickBooksSync;
