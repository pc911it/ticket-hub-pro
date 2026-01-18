import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  RefreshCw, 
  AlertCircle,
  BarChart3,
  FileText,
  Link2
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FinancialData {
  profit_loss?: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
  };
  revenue_summary?: {
    months: Array<{
      month: string;
      year: number;
      revenue: number;
    }>;
  };
  invoices?: {
    total: number;
    unpaid: number;
    overdue: number;
  };
}

interface QuickBooksWidgetsProps {
  compact?: boolean;
}

export const QuickBooksWidgets = ({ compact = false }: QuickBooksWidgetsProps) => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialData>({});
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (effectiveCompanyId) {
      checkConnectionAndFetchData();
    }
  }, [effectiveCompanyId]);

  // Listen for QuickBooks OAuth completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'quickbooks_success') {
        checkConnectionAndFetchData();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [effectiveCompanyId]);

  const checkConnectionAndFetchData = async () => {
    if (!effectiveCompanyId) return;
    
    setIsLoading(true);
    try {
      // Check if QuickBooks is connected
      const { data: integration } = await supabase
        .from('company_integrations')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('provider', 'quickbooks')
        .single();

      setIsConnected(integration?.is_connected || false);
      setLastSyncAt(integration?.last_sync_at || null);

      if (integration?.is_connected) {
        // Fetch cached financial data
        const { data: cache } = await supabase
          .from('quickbooks_financial_cache')
          .select('*')
          .eq('company_id', effectiveCompanyId);

        if (cache) {
          const data: FinancialData = {};
          
          cache.forEach((item: any) => {
            if (item.data_type === 'profit_loss' && item.data?.Rows?.Row) {
              // Parse P&L data
              const rows = item.data.Rows.Row;
              let totalIncome = 0;
              let totalExpenses = 0;

              rows.forEach((row: any) => {
                if (row.group === 'Income' && row.Summary?.ColData?.[1]?.value) {
                  totalIncome = parseFloat(row.Summary.ColData[1].value) || 0;
                }
                if (row.group === 'Expenses' && row.Summary?.ColData?.[1]?.value) {
                  totalExpenses = parseFloat(row.Summary.ColData[1].value) || 0;
                }
              });

              data.profit_loss = {
                totalIncome,
                totalExpenses,
                netIncome: totalIncome - totalExpenses,
              };
            }
            
            if (item.data_type === 'revenue_summary') {
              data.revenue_summary = item.data;
            }

            if (item.data_type === 'invoices' && item.data?.QueryResponse?.Invoice) {
              const invoices = item.data.QueryResponse.Invoice;
              const today = new Date();
              
              data.invoices = {
                total: invoices.length,
                unpaid: invoices.filter((inv: any) => inv.Balance > 0).length,
                overdue: invoices.filter((inv: any) => 
                  inv.Balance > 0 && new Date(inv.DueDate) < today
                ).length,
              };
            }
          });

          setFinancialData(data);
        }
      }
    } catch (error) {
      console.error('Error fetching QuickBooks data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!effectiveCompanyId) return;
    
    setIsSyncing(true);
    try {
      await supabase.functions.invoke('quickbooks-sync', {
        body: { company_id: effectiveCompanyId, sync_all: true }
      });
      await checkConnectionAndFetchData();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <div className="p-3 bg-muted rounded-full mb-4">
            <DollarSign className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">Connect QuickBooks</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Link your QuickBooks account to see revenue, expenses, and financial insights right here.
          </p>
          <Button onClick={() => navigate('/admin/integrations')}>
            <Link2 className="h-4 w-4 mr-2" />
            Connect Now
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    // Compact version for dashboard sidebar
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">QuickBooks</CardTitle>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {financialData.profit_loss && (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Revenue</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(financialData.profit_loss.totalIncome)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Expenses</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(financialData.profit_loss.totalExpenses)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-sm font-medium">Net Income</span>
                <span className={`font-bold ${financialData.profit_loss.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(financialData.profit_loss.netIncome)}
                </span>
              </div>
            </>
          )}
          {lastSyncAt && (
            <p className="text-xs text-muted-foreground">
              Updated {format(new Date(lastSyncAt), 'MMM d, h:mm a')}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full dashboard widgets
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Financial Overview</h3>
          <p className="text-sm text-muted-foreground">
            Data from QuickBooks
            {lastSyncAt && ` • Last synced ${format(new Date(lastSyncAt), 'MMM d, h:mm a')}`}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync'}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {financialData.profit_loss && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(financialData.profit_loss.totalIncome)}
                </div>
                <p className="text-xs text-muted-foreground">Year to date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(financialData.profit_loss.totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground">Year to date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                <DollarSign className={`h-4 w-4 ${financialData.profit_loss.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${financialData.profit_loss.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(financialData.profit_loss.netIncome)}
                </div>
                <p className="text-xs text-muted-foreground">Year to date</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Revenue Chart */}
      {financialData.revenue_summary?.months && financialData.revenue_summary.months.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Revenue
            </CardTitle>
            <CardDescription>Last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={financialData.revenue_summary.months}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Summary */}
      {financialData.invoices && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{financialData.invoices.total}</div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{financialData.invoices.unpaid}</div>
                <p className="text-sm text-muted-foreground">Unpaid</p>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{financialData.invoices.overdue}</div>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {!financialData.profit_loss && !financialData.revenue_summary && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No Data Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Sync" to fetch your financial data from QuickBooks.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuickBooksWidgets;
