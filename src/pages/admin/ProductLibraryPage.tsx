import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Package,
  DollarSign,
  Clock,
  Tag,
  Image,
  FolderOpen
} from 'lucide-react';

const categoryOptions = [
  'Flooring', 'Countertops', 'Cabinets', 'Fixtures', 'Appliances', 
  'Lighting', 'Hardware', 'Tile', 'Paint', 'Windows', 'Doors', 'Other'
];

const ProductLibraryPage = () => {
  const { effectiveCompanyId } = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [catalogFilter, setCatalogFilter] = useState<string>('all');
  const [isCreateCatalogOpen, setIsCreateCatalogOpen] = useState(false);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  
  const [catalogFormData, setCatalogFormData] = useState({
    name: '',
    description: '',
    category: '',
  });

  const [productFormData, setProductFormData] = useState({
    catalog_id: '',
    name: '',
    sku: '',
    description: '',
    category: '',
    brand: '',
    manufacturer: '',
    unit_price: '',
    unit: 'each',
    lead_time_days: '',
    image_url: '',
  });

  const { data: catalogs } = useQuery({
    queryKey: ['product-catalogs', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('product_catalogs')
        .select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['product-items', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('product_items')
        .select(`
          *,
          catalogs:catalog_id(name)
        `)
        .eq('company_id', effectiveCompanyId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!effectiveCompanyId,
  });

  const createCatalogMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('product_catalogs').insert({
        company_id: effectiveCompanyId,
        name: data.name,
        description: data.description,
        category: data.category,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-catalogs'] });
      toast.success('Catalog created');
      setIsCreateCatalogOpen(false);
      setCatalogFormData({ name: '', description: '', category: '' });
    },
    onError: () => toast.error('Failed to create catalog'),
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('product_items').insert({
        company_id: effectiveCompanyId,
        catalog_id: data.catalog_id,
        name: data.name,
        sku: data.sku,
        description: data.description,
        category: data.category,
        brand: data.brand,
        manufacturer: data.manufacturer,
        unit_price: data.unit_price ? parseFloat(data.unit_price) : null,
        unit: data.unit,
        lead_time_days: data.lead_time_days ? parseInt(data.lead_time_days) : null,
        image_url: data.image_url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-items'] });
      toast.success('Product added');
      setIsCreateProductOpen(false);
      setProductFormData({
        catalog_id: '',
        name: '',
        sku: '',
        description: '',
        category: '',
        brand: '',
        manufacturer: '',
        unit_price: '',
        unit: 'each',
        lead_time_days: '',
        image_url: '',
      });
    },
    onError: () => toast.error('Failed to add product'),
  });

  const filteredProducts = products?.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesCatalog = catalogFilter === 'all' || product.catalog_id === catalogFilter;
    return matchesSearch && matchesCategory && matchesCatalog;
  }) || [];

  const stats = [
    { title: 'Catalogs', value: catalogs?.length || 0, icon: FolderOpen, color: 'text-blue-500' },
    { title: 'Products', value: products?.length || 0, icon: Package, color: 'text-green-500' },
    { title: 'Categories', value: new Set(products?.map(p => p.category).filter(Boolean)).size, icon: Tag, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Library</h1>
          <p className="text-muted-foreground">Manage product catalogs for selections and estimates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCreateCatalogOpen(true)}>
            <FolderOpen className="h-4 w-4 mr-2" />
            New Catalog
          </Button>
          <Button onClick={() => setIsCreateProductOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={catalogFilter} onValueChange={setCatalogFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Catalogs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Catalogs</SelectItem>
            {catalogs?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categoryOptions.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="aspect-square bg-muted flex items-center justify-center">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image className="h-12 w-12 text-muted-foreground/30" />
              )}
            </div>
            <CardContent className="p-4">
              <div className="mb-2">
                <h3 className="font-medium line-clamp-1">{product.name}</h3>
                {product.brand && (
                  <p className="text-sm text-muted-foreground">{product.brand}</p>
                )}
              </div>
              
              <div className="flex items-center justify-between mb-2">
                {product.unit_price && (
                  <span className="font-bold text-lg">
                    ${product.unit_price.toLocaleString()}
                    <span className="text-xs text-muted-foreground">/{product.unit}</span>
                  </span>
                )}
                {product.sku && (
                  <Badge variant="outline" className="text-xs">{product.sku}</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-1">
                {product.category && (
                  <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                )}
                {product.catalogs?.name && (
                  <Badge variant="outline" className="text-xs">{product.catalogs.name}</Badge>
                )}
              </div>

              {product.lead_time_days && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {product.lead_time_days} day lead time
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No products found. Add your first product to the library.
          </CardContent>
        </Card>
      )}

      {/* Create Catalog Dialog */}
      <Dialog open={isCreateCatalogOpen} onOpenChange={setIsCreateCatalogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Product Catalog</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createCatalogMutation.mutate(catalogFormData); }}>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={catalogFormData.name}
                  onChange={(e) => setCatalogFormData({ ...catalogFormData, name: e.target.value })}
                  required
                  placeholder="e.g., Premium Flooring Options"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={catalogFormData.category}
                  onValueChange={(v) => setCatalogFormData({ ...catalogFormData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={catalogFormData.description}
                  onChange={(e) => setCatalogFormData({ ...catalogFormData, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsCreateCatalogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCatalogMutation.isPending}>
                {createCatalogMutation.isPending ? 'Creating...' : 'Create Catalog'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Product Dialog */}
      <Dialog open={isCreateProductOpen} onOpenChange={setIsCreateProductOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createProductMutation.mutate(productFormData); }}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2">
                <Label>Catalog *</Label>
                <Select
                  value={productFormData.catalog_id}
                  onValueChange={(v) => setProductFormData({ ...productFormData, catalog_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select catalog" />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogs?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Product Name *</Label>
                <Input
                  value={productFormData.name}
                  onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>SKU</Label>
                <Input
                  value={productFormData.sku}
                  onChange={(e) => setProductFormData({ ...productFormData, sku: e.target.value })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={productFormData.category}
                  onValueChange={(v) => setProductFormData({ ...productFormData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Brand</Label>
                <Input
                  value={productFormData.brand}
                  onChange={(e) => setProductFormData({ ...productFormData, brand: e.target.value })}
                />
              </div>
              <div>
                <Label>Manufacturer</Label>
                <Input
                  value={productFormData.manufacturer}
                  onChange={(e) => setProductFormData({ ...productFormData, manufacturer: e.target.value })}
                />
              </div>
              <div>
                <Label>Unit Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={productFormData.unit_price}
                  onChange={(e) => setProductFormData({ ...productFormData, unit_price: e.target.value })}
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select
                  value={productFormData.unit}
                  onValueChange={(v) => setProductFormData({ ...productFormData, unit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="each">Each</SelectItem>
                    <SelectItem value="sqft">Sq Ft</SelectItem>
                    <SelectItem value="linear_ft">Linear Ft</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lead Time (Days)</Label>
                <Input
                  type="number"
                  value={productFormData.lead_time_days}
                  onChange={(e) => setProductFormData({ ...productFormData, lead_time_days: e.target.value })}
                />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input
                  value={productFormData.image_url}
                  onChange={(e) => setProductFormData({ ...productFormData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={productFormData.description}
                  onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsCreateProductOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProductMutation.isPending || !productFormData.catalog_id}>
                {createProductMutation.isPending ? 'Adding...' : 'Add Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductLibraryPage;
