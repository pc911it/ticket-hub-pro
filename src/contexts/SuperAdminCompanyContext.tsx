import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Company {
  id: string;
  name: string;
  email: string;
  subscription_plan: string | null;
  subscription_status: string | null;
}

interface SuperAdminCompanyContextType {
  companies: Company[];
  selectedCompanyId: string | null;
  selectedCompany: Company | null;
  setSelectedCompanyId: (id: string | null) => void;
  isLoading: boolean;
  isViewingAsCompany: boolean;
  clearSelection: () => void;
}

const SuperAdminCompanyContext = createContext<SuperAdminCompanyContextType | undefined>(undefined);

export const SuperAdminCompanyProvider = ({ children }: { children: ReactNode }) => {
  const { isSuperAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(() => {
    // Restore from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem('superadmin_selected_company') || null;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all companies for super admin
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!isSuperAdmin) {
        setCompanies([]);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, email, subscription_plan, subscription_status')
          .is('deleted_at', null)
          .order('name');

        if (error) throw error;
        setCompanies(data || []);
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, [isSuperAdmin]);

  // Persist selection to localStorage
  useEffect(() => {
    if (selectedCompanyId) {
      localStorage.setItem('superadmin_selected_company', selectedCompanyId);
    } else {
      localStorage.removeItem('superadmin_selected_company');
    }
  }, [selectedCompanyId]);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId) || null;
  const isViewingAsCompany = isSuperAdmin && selectedCompanyId !== null;

  const clearSelection = () => {
    setSelectedCompanyId(null);
  };

  return (
    <SuperAdminCompanyContext.Provider
      value={{
        companies,
        selectedCompanyId,
        selectedCompany,
        setSelectedCompanyId,
        isLoading,
        isViewingAsCompany,
        clearSelection,
      }}
    >
      {children}
    </SuperAdminCompanyContext.Provider>
  );
};

export const useSuperAdminCompany = () => {
  const context = useContext(SuperAdminCompanyContext);
  if (context === undefined) {
    throw new Error('useSuperAdminCompany must be used within a SuperAdminCompanyProvider');
  }
  return context;
};
