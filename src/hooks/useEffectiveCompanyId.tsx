import { useState, useEffect } from 'react';
import { useSuperAdminCompany } from '@/contexts/SuperAdminCompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get the effective company ID for data queries.
 * For Super Admin: returns selected company ID (or null for platform-wide view)
 * For regular users: returns their own company ID
 */
export const useEffectiveCompanyId = () => {
  const { isSuperAdmin, user } = useAuth();
  const { selectedCompanyId, isViewingAsCompany, selectedCompany } = useSuperAdminCompany();
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  // Fetch user's company ID for non-super-admin users
  useEffect(() => {
    const fetchUserCompanyId = async () => {
      if (!user || isSuperAdmin) {
        setUserCompanyId(null);
        return;
      }

      const { data } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserCompanyId(data?.company_id || null);
    };

    fetchUserCompanyId();
  }, [user, isSuperAdmin]);

  // For Super Admin viewing as a specific company
  if (isSuperAdmin && isViewingAsCompany) {
    return {
      effectiveCompanyId: selectedCompanyId,
      isViewingAsCompany: true,
      viewingCompanyName: selectedCompany?.name || null,
      isPlatformView: false,
    };
  }

  // For Super Admin in platform-wide view
  if (isSuperAdmin && !isViewingAsCompany) {
    return {
      effectiveCompanyId: null, // null means show all companies
      isViewingAsCompany: false,
      viewingCompanyName: null,
      isPlatformView: true,
    };
  }

  // For regular users - always their own company
  return {
    effectiveCompanyId: userCompanyId,
    isViewingAsCompany: false,
    viewingCompanyName: null,
    isPlatformView: false,
  };
};
