import { useState, useEffect, useMemo } from 'react';
import { useSuperAdminCompany } from '@/contexts/SuperAdminCompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get the effective company ID for data queries.
 * For Super Admin: returns selected company ID, or their own company if not viewing another
 * For regular users: returns their own company ID
 */
export const useEffectiveCompanyId = () => {
  const { isSuperAdmin, user, loading: authLoading } = useAuth();
  const { selectedCompanyId, isViewingAsCompany, selectedCompany, isLoading: companiesLoading } = useSuperAdminCompany();
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [userCompanyName, setUserCompanyName] = useState<string | null>(null);
  const [isLoadingCompany, setIsLoadingCompany] = useState(true);

  // Fetch user's company ID for ALL users (including super admins)
  useEffect(() => {
    const fetchUserCompanyId = async () => {
      if (!user) {
        setUserCompanyId(null);
        setUserCompanyName(null);
        setIsLoadingCompany(false);
        return;
      }

      setIsLoadingCompany(true);
      
      // First check company_members
      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberData?.company_id) {
        // Get company name too
        const { data: companyData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', memberData.company_id)
          .maybeSingle();
        
        setUserCompanyId(memberData.company_id);
        setUserCompanyName(companyData?.name || null);
      } else {
        // Check if they own a company
        const { data: ownedCompany } = await supabase
          .from('companies')
          .select('id, name')
          .eq('owner_id', user.id)
          .is('deleted_at', null)
          .maybeSingle();
        
        setUserCompanyId(ownedCompany?.id || null);
        setUserCompanyName(ownedCompany?.name || null);
      }
      
      setIsLoadingCompany(false);
    };

    fetchUserCompanyId();
  }, [user]);

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
        ownCompanyId: userCompanyId, // Super admin's own company
      };
    }

    // For Super Admin in platform-wide view - fall back to their own company for settings/operations
    if (isSuperAdmin && !isViewingAsCompany) {
      console.log('[useEffectiveCompanyId] Super Admin platform view, own company:', userCompanyId);
      return {
        effectiveCompanyId: userCompanyId, // Use their own company as default
        isViewingAsCompany: false,
        viewingCompanyName: userCompanyName,
        isPlatformView: true,
        isLoading: authLoading || companiesLoading || isLoadingCompany,
        ownCompanyId: userCompanyId,
      };
    }

    // For regular users - always their own company
    console.log('[useEffectiveCompanyId] Regular user, company:', userCompanyId);
    return {
      effectiveCompanyId: userCompanyId,
      isViewingAsCompany: false,
      viewingCompanyName: userCompanyName,
      isPlatformView: false,
      isLoading: authLoading || isLoadingCompany,
      ownCompanyId: userCompanyId,
    };
  }, [isSuperAdmin, isViewingAsCompany, selectedCompanyId, selectedCompany, userCompanyId, userCompanyName, authLoading, companiesLoading, isLoadingCompany]);

  return result;
};
