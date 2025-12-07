import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ApprovalGuardProps {
  children: React.ReactNode;
}

export function ApprovalGuard({ children }: ApprovalGuardProps) {
  const { user, loading: authLoading, isSuperAdmin } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!user) {
        setChecking(false);
        return;
      }

      // Super admins bypass approval check
      if (isSuperAdmin) {
        setIsApproved(true);
        setChecking(false);
        return;
      }

      try {
        // Get user's company membership
        const { data: membership } = await supabase
          .from("company_members")
          .select("company_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!membership?.company_id) {
          // User has no company, might be super admin or new user
          setIsApproved(true);
          setChecking(false);
          return;
        }

        // Check company approval status
        const { data: company } = await supabase
          .from("companies")
          .select("approval_status")
          .eq("id", membership.company_id)
          .maybeSingle();

        if (company?.approval_status === "approved") {
          setIsApproved(true);
        } else if (company?.approval_status === "rejected") {
          setIsApproved(false);
        } else {
          // Pending
          setIsApproved(false);
        }
      } catch (error) {
        console.error("Error checking approval status:", error);
        setIsApproved(false);
      }

      setChecking(false);
    };

    if (!authLoading) {
      checkApprovalStatus();
    }
  }, [user, authLoading, isSuperAdmin]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isApproved && location.pathname !== "/pending-approval") {
    navigate("/pending-approval", { replace: true });
    return null;
  }

  return <>{children}</>;
}