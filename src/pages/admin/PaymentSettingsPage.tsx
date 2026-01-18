import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Settings, Save, Eye, EyeOff, AlertTriangle, CheckCircle2, XCircle, Shield } from "lucide-react";
import { toast } from "sonner";

interface PaymentSetting {
  id: string;
  company_id: string;
  provider: string;
  is_enabled: boolean;
  stripe_publishable_key: string | null;
  stripe_secret_key_encrypted: string | null;
  square_application_id: string | null;
  square_access_token_encrypted: string | null;
  square_location_id: string | null;
  square_environment: string | null;
  stripe_webhook_secret_encrypted: string | null;
}

export default function PaymentSettingsPage() {
  const { user, isCompanyOwner, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("stripe");
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showSquareToken, setShowSquareToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Stripe form state
  const [stripeForm, setStripeForm] = useState({
    publishableKey: "",
    secretKey: "",
    webhookSecret: "",
    isEnabled: false,
  });

  // Square form state
  const [squareForm, setSquareForm] = useState({
    applicationId: "",
    accessToken: "",
    locationId: "",
    environment: "sandbox" as "sandbox" | "production",
    isEnabled: false,
  });

  // Fetch company
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["payment-settings-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: membership } = await supabase
        .from("company_members")
        .select("company_id, role")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (!membership) return null;
      
      const { data: companyData } = await supabase
        .from("companies")
        .select("id, name")
        .eq("id", membership.company_id)
        .single();
      
      return { ...companyData, userRole: membership.role };
    },
    enabled: !!user?.id,
  });

  // Fetch existing payment settings
  const { data: paymentSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["company-payment-settings", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("company_payment_settings")
        .select("*")
        .eq("company_id", company.id);
      
      if (error) throw error;
      return (data || []) as PaymentSetting[];
    },
    enabled: !!company?.id,
  });

  // Populate forms with existing data
  useEffect(() => {
    if (paymentSettings) {
      const stripeSetting = paymentSettings.find(s => s.provider === "stripe");
      const squareSetting = paymentSettings.find(s => s.provider === "square");

      if (stripeSetting) {
        setStripeForm({
          publishableKey: stripeSetting.stripe_publishable_key || "",
          secretKey: stripeSetting.stripe_secret_key_encrypted || "",
          webhookSecret: stripeSetting.stripe_webhook_secret_encrypted || "",
          isEnabled: stripeSetting.is_enabled,
        });
      }

      if (squareSetting) {
        setSquareForm({
          applicationId: squareSetting.square_application_id || "",
          accessToken: squareSetting.square_access_token_encrypted || "",
          locationId: squareSetting.square_location_id || "",
          environment: (squareSetting.square_environment as "sandbox" | "production") || "sandbox",
          isEnabled: squareSetting.is_enabled,
        });
      }
    }
  }, [paymentSettings]);

  // Save Stripe settings via secure edge function
  const saveStripeMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("No company found");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("save-payment-settings", {
        body: {
          company_id: company.id,
          provider: "stripe",
          is_enabled: stripeForm.isEnabled,
          stripe_publishable_key: stripeForm.publishableKey,
          stripe_secret_key: stripeForm.secretKey,
          stripe_webhook_secret: stripeForm.webhookSecret,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data?.success) throw new Error(response.data?.error || "Failed to save settings");
      
      return response.data;
    },
    onSuccess: () => {
      toast.success("Stripe settings saved securely");
      queryClient.invalidateQueries({ queryKey: ["company-payment-settings"] });
      // Clear sensitive fields from form after save
      setStripeForm(prev => ({
        ...prev,
        secretKey: prev.secretKey ? "••••••••" : "",
        webhookSecret: prev.webhookSecret ? "••••••••" : "",
      }));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Save Square settings via secure edge function
  const saveSquareMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("No company found");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("save-payment-settings", {
        body: {
          company_id: company.id,
          provider: "square",
          is_enabled: squareForm.isEnabled,
          square_application_id: squareForm.applicationId,
          square_access_token: squareForm.accessToken,
          square_location_id: squareForm.locationId,
          square_environment: squareForm.environment,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data?.success) throw new Error(response.data?.error || "Failed to save settings");
      
      return response.data;
    },
    onSuccess: () => {
      toast.success("Square settings saved securely");
      queryClient.invalidateQueries({ queryKey: ["company-payment-settings"] });
      // Clear sensitive fields from form after save
      setSquareForm(prev => ({
        ...prev,
        accessToken: prev.accessToken ? "••••••••" : "",
      }));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const isOwnerOrAdmin = company?.userRole === "admin" || isCompanyOwner || isSuperAdmin;
  const isLoading = companyLoading || settingsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No company found. Please register a company first.</p>
      </div>
    );
  }

  if (!isOwnerOrAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Only company owners and admins can manage payment settings.</p>
      </div>
    );
  }

  const stripeEnabled = paymentSettings?.find(s => s.provider === "stripe")?.is_enabled;
  const squareEnabled = paymentSettings?.find(s => s.provider === "square")?.is_enabled;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payment Settings</h1>
        <p className="text-muted-foreground">
          Configure your payment providers to charge clients for invoices and subscriptions
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stripe</CardTitle>
            {stripeEnabled ? (
              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Disabled
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Accept credit cards, debit cards, and more with Stripe.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Square</CardTitle>
            {squareEnabled ? (
              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Disabled
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Process payments with Square's secure payment platform.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Payment Provider Configuration
          </CardTitle>
          <CardDescription>
            Enter your API credentials to enable payment processing. These are stored securely and used only for processing payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stripe" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Stripe
              </TabsTrigger>
              <TabsTrigger value="square" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Square
              </TabsTrigger>
            </TabsList>

            {/* Stripe Configuration */}
            <TabsContent value="stripe" className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="stripe-enabled">Enable Stripe</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow clients to pay via Stripe
                  </p>
                </div>
                <Switch
                  id="stripe-enabled"
                  checked={stripeForm.isEnabled}
                  onCheckedChange={(checked) => setStripeForm({ ...stripeForm, isEnabled: checked })}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stripe-publishable">Publishable Key</Label>
                  <Input
                    id="stripe-publishable"
                    placeholder="pk_live_51ABC123xyz789DEFghijklmnopqrstuvwxyz"
                    value={stripeForm.publishableKey}
                    onChange={(e) => setStripeForm({ ...stripeForm, publishableKey: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Example: pk_live_51ABC123... or pk_test_51ABC123... (Find in Stripe Dashboard → Developers → API Keys)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe-secret">Secret Key</Label>
                  <div className="relative">
                    <Input
                      id="stripe-secret"
                      type={showStripeSecret ? "text" : "password"}
                      placeholder="sk_live_51ABC123xyz789DEFghijklmnopqrstuvwxyz"
                      value={stripeForm.secretKey}
                      onChange={(e) => setStripeForm({ ...stripeForm, secretKey: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowStripeSecret(!showStripeSecret)}
                    >
                      {showStripeSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Example: sk_live_51ABC123... or sk_test_51ABC123... (encrypted and stored securely)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe-webhook">Webhook Secret (Optional)</Label>
                  <div className="relative">
                    <Input
                      id="stripe-webhook"
                      type={showWebhookSecret ? "text" : "password"}
                      placeholder="whsec_abc123xyz789DEFghijklmnopqrstuvwxyz1234567890"
                      value={stripeForm.webhookSecret}
                      onChange={(e) => setStripeForm({ ...stripeForm, webhookSecret: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    >
                      {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Example: whsec_abc123... (Required for receiving payment status updates)
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => saveStripeMutation.mutate()}
                  disabled={saveStripeMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveStripeMutation.isPending ? "Saving..." : "Save Stripe Settings"}
                </Button>
              </div>
            </TabsContent>

            {/* Square Configuration */}
            <TabsContent value="square" className="space-y-4 mt-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="space-y-0.5">
                  <Label htmlFor="square-enabled">Enable Square</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow clients to pay via Square
                  </p>
                </div>
                <Switch
                  id="square-enabled"
                  checked={squareForm.isEnabled}
                  onCheckedChange={(checked) => setSquareForm({ ...squareForm, isEnabled: checked })}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="square-environment">Environment</Label>
                  <Select
                    value={squareForm.environment}
                    onValueChange={(value: "sandbox" | "production") => 
                      setSquareForm({ ...squareForm, environment: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                      <SelectItem value="production">Production (Live)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Use Sandbox for testing, Production for live payments
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="square-app-id">Application ID</Label>
                  <Input
                    id="square-app-id"
                    placeholder="sq0idp-abc123XYZ789defGHI456jklMNO"
                    value={squareForm.applicationId}
                    onChange={(e) => setSquareForm({ ...squareForm, applicationId: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Example: sq0idp-abc123... or sandbox-sq0idp-abc123... (Find in Square Developer Dashboard → Applications)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="square-token">Access Token</Label>
                  <div className="relative">
                    <Input
                      id="square-token"
                      type={showSquareToken ? "text" : "password"}
                      placeholder="EAAAlxyz123ABC456def789GHI012jklMNO345pqrSTU678vwxYZ"
                      value={squareForm.accessToken}
                      onChange={(e) => setSquareForm({ ...squareForm, accessToken: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSquareToken(!showSquareToken)}
                    >
                      {showSquareToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Example: EAAAlxyz123... (encrypted and stored securely)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="square-location">Location ID</Label>
                  <Input
                    id="square-location"
                    placeholder="LABC123XYZ789DEF456GHI"
                    value={squareForm.locationId}
                    onChange={(e) => setSquareForm({ ...squareForm, locationId: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Example: LABC123XYZ... (Find in Square Dashboard → Locations)
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => saveSquareMutation.mutate()}
                  disabled={saveSquareMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveSquareMutation.isPending ? "Saving..." : "Save Square Settings"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-green-500/50 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Shield className="h-5 w-5" />
            Secure Storage
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • Your API keys are encrypted server-side before storage - they never touch the database in plaintext.
          </p>
          <p>
            • Secret keys are processed through a secure backend function with proper authentication.
          </p>
          <p>
            • Sensitive values are masked after saving and cannot be retrieved in plaintext.
          </p>
          <p>
            • We recommend using restricted API keys with only the permissions needed for payment processing.
          </p>
          <p>
            • Test your integration in Sandbox/Test mode before going live.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
