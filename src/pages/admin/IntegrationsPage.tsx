import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { 
  Link2, 
  Unlink, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  DollarSign,
  FileText,
  TrendingUp,
  Calendar
} from "lucide-react";
import { format } from "date-fns";

interface Integration {
  id: string;
  provider: string;
  is_connected: boolean;
  realm_id: string | null;
  last_sync_at: string | null;
  sync_settings: {
    auto_sync?: boolean;
    sync_invoices?: boolean;
    sync_payments?: boolean;
    sync_customers?: boolean;
  };
}

const IntegrationsPage = () => {
  const { t } = useTranslation();
  const { effectiveCompanyId, isLoading: companyLoading } = useEffectiveCompanyId();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (effectiveCompanyId) {
      fetchIntegrations();
    }
  }, [effectiveCompanyId]);

  const fetchIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('company_integrations')
        .select('*')
        .eq('company_id', effectiveCompanyId);

      if (error) throw error;
      setIntegrations((data || []).map((item: any) => ({
        ...item,
        sync_settings: item.sync_settings as Integration['sync_settings'] || {}
      })));
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectQuickBooks = async () => {
    if (!effectiveCompanyId) return;
    
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('quickbooks-auth', {
        body: { 
          action: 'get_auth_url',
          company_id: effectiveCompanyId 
        }
      });

      if (error) throw error;
      
      if (data?.auth_url) {
        // Open QuickBooks OAuth in a popup
        window.open(data.auth_url, 'quickbooks_auth', 'width=600,height=700');
      } else {
        throw new Error('No auth URL returned');
      }
    } catch (error: any) {
      console.error('Error connecting QuickBooks:', error);
      toast.error(error.message || 'Failed to connect to QuickBooks');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectQuickBooks = async () => {
    if (!effectiveCompanyId) return;
    
    try {
      const { error } = await supabase
        .from('company_integrations')
        .delete()
        .eq('company_id', effectiveCompanyId)
        .eq('provider', 'quickbooks');

      if (error) throw error;
      
      toast.success('QuickBooks disconnected successfully');
      fetchIntegrations();
    } catch (error) {
      console.error('Error disconnecting QuickBooks:', error);
      toast.error('Failed to disconnect QuickBooks');
    }
  };

  const handleSyncNow = async () => {
    if (!effectiveCompanyId) return;
    
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('quickbooks-sync', {
        body: { 
          company_id: effectiveCompanyId,
          sync_all: true
        }
      });

      if (error) throw error;
      
      toast.success('Sync completed successfully');
      fetchIntegrations();
    } catch (error: any) {
      console.error('Error syncing:', error);
      toast.error(error.message || 'Failed to sync with QuickBooks');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateSyncSettings = async (setting: string, value: boolean) => {
    const qbIntegration = integrations.find(i => i.provider === 'quickbooks');
    if (!qbIntegration) return;

    try {
      const newSettings = {
        ...qbIntegration.sync_settings,
        [setting]: value
      };

      const { error } = await supabase
        .from('company_integrations')
        .update({ sync_settings: newSettings })
        .eq('id', qbIntegration.id);

      if (error) throw error;
      
      toast.success('Settings updated');
      fetchIntegrations();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const qbIntegration = integrations.find(i => i.provider === 'quickbooks');

  if (companyLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">Connect your business tools</p>
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">Connect your business tools and sync data automatically</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* QuickBooks Integration Card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-500/10 to-transparent" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    QuickBooks Online
                    {qbIntegration?.is_connected ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Sync your accounting data, invoices, and financial reports
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {qbIntegration?.is_connected ? (
              <>
                {/* Connection Info */}
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Company ID:</span>
                    <span className="font-mono">{qbIntegration.realm_id}</span>
                  </div>
                  {qbIntegration.last_sync_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Sync:</span>
                      <span>{format(new Date(qbIntegration.last_sync_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  )}
                </div>

                {/* Sync Settings */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Sync Settings</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto_sync" className="text-sm">Auto-sync daily</Label>
                      <Switch
                        id="auto_sync"
                        checked={qbIntegration.sync_settings?.auto_sync ?? false}
                        onCheckedChange={(checked) => handleUpdateSyncSettings('auto_sync', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sync_invoices" className="text-sm">Sync invoices</Label>
                      <Switch
                        id="sync_invoices"
                        checked={qbIntegration.sync_settings?.sync_invoices ?? true}
                        onCheckedChange={(checked) => handleUpdateSyncSettings('sync_invoices', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sync_payments" className="text-sm">Sync payments</Label>
                      <Switch
                        id="sync_payments"
                        checked={qbIntegration.sync_settings?.sync_payments ?? true}
                        onCheckedChange={(checked) => handleUpdateSyncSettings('sync_payments', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sync_customers" className="text-sm">Sync customers</Label>
                      <Switch
                        id="sync_customers"
                        checked={qbIntegration.sync_settings?.sync_customers ?? true}
                        onCheckedChange={(checked) => handleUpdateSyncSettings('sync_customers', checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={handleSyncNow} 
                    disabled={isSyncing}
                    className="flex-1"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleDisconnectQuickBooks}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* Features List */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>Import invoices and estimates</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>View profit & loss reports</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Track monthly revenue</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>Sync customer payments</span>
                  </div>
                </div>

                {/* Connect Button */}
                <Button 
                  onClick={handleConnectQuickBooks}
                  disabled={isConnecting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  {isConnecting ? 'Connecting...' : 'Connect QuickBooks'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Coming Soon Card */}
        <Card className="relative overflow-hidden opacity-60">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Xero
                  <Badge variant="outline">Coming Soon</Badge>
                </CardTitle>
                <CardDescription>
                  Connect your Xero account for accounting sync
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button disabled className="w-full">
              <Link2 className="h-4 w-4 mr-2" />
              Connect Xero
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IntegrationsPage;
