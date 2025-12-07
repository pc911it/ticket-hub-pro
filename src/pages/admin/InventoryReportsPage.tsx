import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { TrendingUp, TrendingDown, Package, AlertTriangle, BarChart3, Activity } from 'lucide-react';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

interface InventoryItem {
  id: string;
  name: string;
  quantity_in_stock: number;
  minimum_stock: number | null;
  cost_per_unit: number | null;
  category: string | null;
}

interface UsageRecord {
  id: string;
  inventory_item_id: string;
  quantity_used: number;
  created_at: string;
  inventory_items: { name: string; category: string | null } | null;
}

interface ChartData {
  date: string;
  usage: number;
  [key: string]: string | number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--info))',
  'hsl(var(--warning))',
  'hsl(var(--success))',
  'hsl(var(--destructive))',
  'hsl(var(--accent))',
];

const InventoryReportsPage = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    const daysAgo = parseInt(dateRange);
    const startDate = subDays(new Date(), daysAgo).toISOString();

    const [{ data: inventoryData }, { data: usageData }] = await Promise.all([
      supabase.from('inventory_items').select('*').order('name'),
      supabase
        .from('inventory_usage')
        .select('id, inventory_item_id, quantity_used, created_at, inventory_items(name, category)')
        .gte('created_at', startDate)
        .order('created_at', { ascending: true }),
    ]);

    if (inventoryData) setInventory(inventoryData);
    if (usageData) setUsage(usageData);
    setLoading(false);
  };

  // Calculate usage trends over time
  const getUsageTrendData = (): ChartData[] => {
    const daysAgo = parseInt(dateRange);
    const days = eachDayOfInterval({
      start: subDays(new Date(), daysAgo),
      end: new Date(),
    });

    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayUsage = usage.filter(u => {
        const usageDate = startOfDay(new Date(u.created_at));
        return usageDate.getTime() === dayStart.getTime();
      });

      const totalUsage = dayUsage.reduce((sum, u) => sum + u.quantity_used, 0);

      return {
        date: format(day, 'MMM d'),
        usage: totalUsage,
      };
    });
  };

  // Calculate usage by category
  const getCategoryData = () => {
    const categoryMap: Record<string, number> = {};
    
    usage.forEach(u => {
      const category = u.inventory_items?.category || 'Uncategorized';
      categoryMap[category] = (categoryMap[category] || 0) + u.quantity_used;
    });

    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  };

  // Get top used items
  const getTopUsedItems = () => {
    const itemMap: Record<string, { name: string; total: number }> = {};
    
    usage.forEach(u => {
      const id = u.inventory_item_id;
      const name = u.inventory_items?.name || 'Unknown';
      if (!itemMap[id]) {
        itemMap[id] = { name, total: 0 };
      }
      itemMap[id].total += u.quantity_used;
    });

    return Object.values(itemMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  };

  // Calculate restock predictions
  const getRestockPredictions = () => {
    const daysAgo = parseInt(dateRange);
    
    return inventory
      .map(item => {
        const itemUsage = usage.filter(u => u.inventory_item_id === item.id);
        const totalUsed = itemUsage.reduce((sum, u) => sum + u.quantity_used, 0);
        const dailyAverage = totalUsed / daysAgo;
        
        const daysUntilEmpty = dailyAverage > 0 
          ? Math.floor(item.quantity_in_stock / dailyAverage)
          : Infinity;
        
        const minimumStock = item.minimum_stock || 0;
        const daysUntilMinimum = dailyAverage > 0 && item.quantity_in_stock > minimumStock
          ? Math.floor((item.quantity_in_stock - minimumStock) / dailyAverage)
          : item.quantity_in_stock <= minimumStock ? 0 : Infinity;

        return {
          ...item,
          dailyAverage: dailyAverage.toFixed(1),
          daysUntilEmpty: daysUntilEmpty === Infinity ? '∞' : daysUntilEmpty,
          daysUntilMinimum: daysUntilMinimum === Infinity ? '∞' : daysUntilMinimum,
          needsRestock: daysUntilMinimum !== Infinity && daysUntilMinimum <= 7,
          critical: daysUntilEmpty !== Infinity && daysUntilEmpty <= 3,
        };
      })
      .sort((a, b) => {
        if (a.critical && !b.critical) return -1;
        if (!a.critical && b.critical) return 1;
        if (a.needsRestock && !b.needsRestock) return -1;
        if (!a.needsRestock && b.needsRestock) return 1;
        return 0;
      });
  };

  // Stock level distribution
  const getStockLevelData = () => {
    const levels = { critical: 0, low: 0, adequate: 0, high: 0 };
    
    inventory.forEach(item => {
      const minStock = item.minimum_stock || 0;
      const ratio = minStock > 0 ? item.quantity_in_stock / minStock : 2;
      
      if (ratio <= 0.5) levels.critical++;
      else if (ratio <= 1) levels.low++;
      else if (ratio <= 2) levels.adequate++;
      else levels.high++;
    });

    return [
      { name: 'Critical', value: levels.critical, color: 'hsl(var(--destructive))' },
      { name: 'Low', value: levels.low, color: 'hsl(var(--warning))' },
      { name: 'Adequate', value: levels.adequate, color: 'hsl(var(--success))' },
      { name: 'High', value: levels.high, color: 'hsl(var(--info))' },
    ].filter(l => l.value > 0);
  };

  // Calculate summary stats
  const totalUsage = usage.reduce((sum, u) => sum + u.quantity_used, 0);
  const totalValue = inventory.reduce((sum, item) => 
    sum + (item.quantity_in_stock * (item.cost_per_unit || 0)), 0
  );
  const lowStockCount = inventory.filter(i => 
    i.minimum_stock && i.quantity_in_stock <= i.minimum_stock
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Inventory Reports</h1>
          <p className="text-muted-foreground mt-1">Usage analytics and restock predictions.</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Usage</p>
                <p className="text-2xl font-bold">{totalUsage.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Last {dateRange} days</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-bold">${totalValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Current stock</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{inventory.length}</p>
                <p className="text-xs text-muted-foreground">In inventory</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold">{lowStockCount}</p>
                <p className="text-xs text-muted-foreground">Need attention</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Usage Trends</TabsTrigger>
          <TabsTrigger value="restock">Restock Predictions</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          {/* Usage Over Time */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="font-display">Usage Over Time</CardTitle>
              <CardDescription>Daily material consumption</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getUsageTrendData()}>
                    <defs>
                      <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="usage" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#usageGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Used Items */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="font-display">Top Used Items</CardTitle>
              <CardDescription>Most consumed materials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getTopUsedItems()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={120} 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="restock" className="space-y-4">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="font-display">Restock Predictions</CardTitle>
              <CardDescription>Based on usage patterns from the last {dateRange} days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Item</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Current Stock</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Min Stock</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Daily Avg</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Days Until Min</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Days Until Empty</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getRestockPredictions().map(item => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/50">
                        <td className="py-3 px-2 font-medium">{item.name}</td>
                        <td className="py-3 px-2 text-right">{item.quantity_in_stock}</td>
                        <td className="py-3 px-2 text-right">{item.minimum_stock || '-'}</td>
                        <td className="py-3 px-2 text-right">{item.dailyAverage}</td>
                        <td className="py-3 px-2 text-right">
                          <span className={item.needsRestock ? 'text-warning font-medium' : ''}>
                            {item.daysUntilMinimum}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className={item.critical ? 'text-destructive font-medium' : ''}>
                            {item.daysUntilEmpty}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {item.critical ? (
                            <Badge variant="destructive" className="gap-1">
                              <TrendingDown className="h-3 w-3" />
                              Critical
                            </Badge>
                          ) : item.needsRestock ? (
                            <Badge variant="outline" className="border-warning text-warning gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Restock Soon
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-success text-success gap-1">
                              <TrendingUp className="h-3 w-3" />
                              OK
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Usage by Category */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="font-display">Usage by Category</CardTitle>
                <CardDescription>Material consumption distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getCategoryData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {getCategoryData().map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                </div>
              </CardContent>
            </Card>

            {/* Stock Level Distribution */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="font-display">Stock Level Distribution</CardTitle>
                <CardDescription>Current inventory health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getStockLevelData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {getStockLevelData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InventoryReportsPage;
