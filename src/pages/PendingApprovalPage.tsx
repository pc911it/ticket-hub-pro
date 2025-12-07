import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Building2, Mail, RefreshCw, XCircle, LogOut } from "lucide-react";

export default function PendingApprovalPage() {
  const { user, signOut, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState<{ name: string; approval_status: string } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      navigate("/admin", { replace: true });
      return;
    }
    fetchCompanyStatus();
  }, [isSuperAdmin, navigate]);

  const fetchCompanyStatus = async () => {
    if (!user) return;

    const { data: membership } = await supabase
      .from("company_members")
      .select("company_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membership?.company_id) {
      const { data: companyData } = await supabase
        .from("companies")
        .select("name, approval_status")
        .eq("id", membership.company_id)
        .maybeSingle();

      setCompany(companyData);

      if (companyData?.approval_status === "approved") {
        navigate("/admin", { replace: true });
      }
    }
  };

  const handleRefresh = async () => {
    setChecking(true);
    await fetchCompanyStatus();
    setChecking(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth", { replace: true });
  };

  const isRejected = company?.approval_status === "rejected";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="max-w-md w-full shadow-lg border-0">
        <CardHeader className="text-center pb-2">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            isRejected ? "bg-destructive/10" : "bg-warning/10"
          }`}>
            {isRejected ? (
              <XCircle className="h-8 w-8 text-destructive" />
            ) : (
              <Clock className="h-8 w-8 text-warning" />
            )}
          </div>
          <CardTitle className="text-2xl font-display">
            {isRejected ? "Registration Rejected" : "Pending Approval"}
          </CardTitle>
          <CardDescription className="text-base">
            {isRejected
              ? "Unfortunately, your company registration has been rejected."
              : "Your company registration is being reviewed."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {company && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{company.name}</span>
              </div>
              {user?.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
              )}
            </div>
          )}

          {!isRejected && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Our team will review your registration and notify you once approved.</p>
              <p className="mt-2">This usually takes 1-2 business days.</p>
            </div>
          )}

          {isRejected && (
            <div className="text-center text-sm text-muted-foreground">
              <p>If you believe this was a mistake, please contact our support team.</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {!isRejected && (
              <Button onClick={handleRefresh} disabled={checking} variant="outline" className="w-full">
                <RefreshCw className={`h-4 w-4 mr-2 ${checking ? "animate-spin" : ""}`} />
                Check Status
              </Button>
            )}
            <Button onClick={handleSignOut} variant="ghost" className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}