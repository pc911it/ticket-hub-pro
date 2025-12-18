import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  Building2, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PLAN_PRICES = {
  starter: 29,
  professional: 79,
  enterprise: 199
};

const STATUS_COLORS = {
  trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  past_due: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
};

const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const SuperAdminBillingPage = () => {
  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['all-companies-billing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: billingHistory, isLoading: billingLoading } = useQuery({
    queryKey: ['all-billing-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_history')
        .select('*, companies(name)')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    }
  });

  // Calculate metrics
  const metrics = {
    totalCompanies: companies?.length || 0,
    activeSubscriptions: companies?.filter(c => c.subscription_status === 'active').length || 0,
    trialCompanies: companies?.filter(c => c.subscription_status === 'trial').length || 0,
    pastDue: companies?.filter(c => c.subscription_status === 'past_due').length || 0,
    monthlyRecurringRevenue: companies?.reduce((acc, c) => {
      if (c.subscription_status === 'active' && c.subscription_plan) {
        return acc + (PLAN_PRICES[c.subscription_plan as keyof typeof PLAN_PRICES] || 0);
      }
      return acc;
    }, 0) || 0,
    totalRevenue: billingHistory?.filter(b => b.status === 'completed').reduce((acc, b) => acc + b.amount, 0) || 0
  };

  // Plan distribution for pie chart
  const planDistribution = companies?.reduce((acc, c) => {
    const plan = c.subscription_plan || 'none';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const pieData = Object.entries(planDistribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  // Status distribution for bar chart
  const statusDistribution = companies?.reduce((acc, c) => {
    const status = c.subscription_status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const barData = Object.entries(statusDistribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
    count: value
  }));

  const getTrialDaysRemaining = (trialEndsAt: string | null) => {
    if (!trialEndsAt) return null;
    const days = differenceInDays(new Date(trialEndsAt), new Date());
    return days > 0 ? days : 0;
  };

  const getStatusBadge = (status: string | null) => {
    const statusKey = status || 'unknown';
    const colorClass = STATUS_COLORS[statusKey as keyof typeof STATUS_COLORS] || STATUS_COLORS.expired;
    return (
      <Badge className={colorClass}>
        {statusKey.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Platform Billing Overview</h1>
          <p className="text-muted-foreground">Monitor revenue, subscriptions, and payment status across all companies</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {companiesLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">${metrics.monthlyRecurringRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">from {metrics.activeSubscriptions} active subscriptions</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {billingLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">${(metrics.totalRevenue / 100).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">all-time collected</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial Companies</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {companiesLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{metrics.trialCompanies}</div>
                  <p className="text-xs text-muted-foreground">active trials</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Past Due</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {companiesLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-destructive">{metrics.pastDue}</div>
                  <p className="text-xs text-muted-foreground">require attention</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Status Distribution</CardTitle>
              <CardDescription>Companies by subscription status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan Distribution</CardTitle>
              <CardDescription>Companies by subscription plan</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for detailed views */}
        <Tabs defaultValue="companies" className="space-y-4">
          <TabsList>
            <TabsTrigger value="companies">All Companies</TabsTrigger>
            <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
            <TabsTrigger value="expiring">Expiring Trials</TabsTrigger>
          </TabsList>

          <TabsContent value="companies">
            <Card>
              <CardHeader>
                <CardTitle>Company Subscriptions</CardTitle>
                <CardDescription>All registered companies and their billing status</CardDescription>
              </CardHeader>
              <CardContent>
                {companiesLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Trial Ends</TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">MRR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies?.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {company.subscription_plan || 'None'}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(company.subscription_status)}</TableCell>
                          <TableCell>
                            {company.trial_ends_at ? (
                              <span className={getTrialDaysRemaining(company.trial_ends_at) === 0 ? 'text-destructive' : ''}>
                                {format(new Date(company.trial_ends_at), 'MMM d, yyyy')}
                                {getTrialDaysRemaining(company.trial_ends_at) !== null && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({getTrialDaysRemaining(company.trial_ends_at)} days)
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {company.square_card_id ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <CreditCard className="h-3 w-3" />
                                On file
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Not set</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {company.subscription_status === 'active' && company.subscription_plan ? (
                              <span className="font-medium">
                                ${PLAN_PRICES[company.subscription_plan as keyof typeof PLAN_PRICES] || 0}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">$0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest payment activity across all companies</CardDescription>
              </CardHeader>
              <CardContent>
                {billingLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : billingHistory?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No transactions yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billingHistory?.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {(transaction.companies as any)?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            {transaction.status === 'completed' ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            ) : transaction.status === 'failed' ? (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                <XCircle className="h-3 w-3 mr-1" />
                                Failed
                              </Badge>
                            ) : (
                              <Badge variant="outline">{transaction.status}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${(transaction.amount / 100).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expiring">
            <Card>
              <CardHeader>
                <CardTitle>Expiring Trials</CardTitle>
                <CardDescription>Companies with trials ending soon</CardDescription>
              </CardHeader>
              <CardContent>
                {companiesLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Trial Ends</TableHead>
                        <TableHead>Days Remaining</TableHead>
                        <TableHead>Payment Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies
                        ?.filter(c => c.subscription_status === 'trial' && c.trial_ends_at)
                        .sort((a, b) => new Date(a.trial_ends_at!).getTime() - new Date(b.trial_ends_at!).getTime())
                        .map((company) => {
                          const daysRemaining = getTrialDaysRemaining(company.trial_ends_at);
                          return (
                            <TableRow key={company.id}>
                              <TableCell className="font-medium">{company.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {company.subscription_plan || 'None'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {format(new Date(company.trial_ends_at!), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  className={
                                    daysRemaining === 0 ? 'bg-red-100 text-red-800' :
                                    daysRemaining! <= 3 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }
                                >
                                  {daysRemaining} days
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {company.square_card_id ? (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-3 w-3" />
                                    Ready
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-destructive">
                                    <AlertCircle className="h-3 w-3" />
                                    Missing
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default SuperAdminBillingPage;
