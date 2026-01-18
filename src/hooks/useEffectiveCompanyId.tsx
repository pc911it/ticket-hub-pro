import { useState, useEffect, useMemo } from 'react';
import { useSuperAdminCompany } from '@/contexts/SuperAdminCompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get the effective company ID for data queries.
 * For Super Admin: returns selected company ID (or null for platform-wide view)
 * For regular users: returns their own company ID
 */
export const useEffectiveCompanyId = () => {
  const { isSuperAdmin, user, loading: authLoading } = useAuth();
  const { selectedCompanyId, isViewingAsCompany, selectedCompany, isLoading: companiesLoading } = useSuperAdminCompany();
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);

  // Fetch user's company ID for non-super-admin users
  useEffect(() => {
    const fetchUserCompanyId = async () => {
      if (!user) {
        setUserCompanyId(null);
        setIsLoadingCompany(false);
        return;
      }

      // For super admins, we don't need their company ID
      if (isSuperAdmin) {
        setUserCompanyId(null);
        setIsLoadingCompany(false);
        return;
      }

      setIsLoadingCompany(true);
      const { data } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserCompanyId(data?.company_id || null);
      setIsLoadingCompany(false);
    };

    fetchUserCompanyId();
  }, [user, isSuperAdmin]);

  // Use useMemo to ensure stable reference and proper reactivity
  const result = useMemo(() => {
    console.log('[useEffectiveCompanyId] Computing:', {
      isSuperAdmin,
      isViewingAsCompany,
      selectedCompanyId,
      userCompanyId,
      authLoading,
      companiesLoading
    });

    // For Super Admin viewing as a specific company
    if (isSuperAdmin && isViewingAsCompany && selectedCompanyId) {
      console.log('[useEffectiveCompanyId] Super Admin viewing company:', selectedCompanyId);
      return {
        effectiveCompanyId: selectedCompanyId,
        isViewingAsCompany: true,
        viewingCompanyName: selectedCompany?.name || null,
        isPlatformView: false,
        isLoading: authLoading || companiesLoading,
      };
    }

    // For Super Admin in platform-wide view
    if (isSuperAdmin && !isViewingAsCompany) {
      console.log('[useEffectiveCompanyId] Super Admin platform view (all companies)');
      return {
        effectiveCompanyId: null, // null means show all companies
        isViewingAsCompany: false,
        viewingCompanyName: null,
        isPlatformView: true,
        isLoading: authLoading || companiesLoading,
      };
    }

    // For regular users - always their own company
    console.log('[useEffectiveCompanyId] Regular user, company:', userCompanyId);
    return {
      effectiveCompanyId: userCompanyId,
      isViewingAsCompany: false,
      viewingCompanyName: null,
      isPlatformView: false,
      isLoading: authLoading || isLoadingCompany,
    };
  }, [isSuperAdmin, isViewingAsCompany, selectedCompanyId, selectedCompany, userCompanyId, authLoading, companiesLoading, isLoadingCompany]);

  return result;
};
