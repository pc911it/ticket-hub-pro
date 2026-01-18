import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Download, FileSpreadsheet, FileJson, Users, FolderOpen, Ticket, Receipt, Wrench, UserCog, FileText, HelpCircle } from 'lucide-react';
import { ImportDialog, ImportDataType } from '@/components/import/ImportDialog';
import { ExportDialog } from '@/components/import/ExportDialog';
import { useTranslation } from 'react-i18next';

const DATA_TYPES: { 
  type: ImportDataType; 
  label: string; 
  description: string; 
  icon: React.ElementType 
}[] = [
  { type: 'clients', label: 'Clients', description: 'Customer contact information and details', icon: Users },
  { type: 'projects', label: 'Projects', description: 'Project records with status and budget', icon: FolderOpen },
  { type: 'tickets', label: 'Tickets', description: 'Support tickets and service requests', icon: Ticket },
  { type: 'invoices', label: 'Invoices', description: 'Client invoices and billing records', icon: Receipt },
  { type: 'estimates', label: 'Estimates', description: 'Cost estimates and quotes', icon: FileText },
  { type: 'equipment', label: 'Equipment', description: 'Equipment and asset inventory', icon: Wrench },
  { type: 'agents', label: 'Employees', description: 'Staff and agent information', icon: UserCog },
];

const ImportExportPage = () => {
  const { t } = useTranslation();
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ImportDataType>('clients');

  const handleImport = (type: ImportDataType) => {
    setSelectedType(type);
    setImportOpen(true);
  };

  const handleExport = (type: ImportDataType) => {
    setSelectedType(type);
    setExportOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import & Export</h1>
          <p className="text-muted-foreground">
            Import data from CSV or JSON files, or export your data for backup and migration
          </p>
        </div>

        <Tabs defaultValue="import" className="space-y-4">
          <TabsList>
            <TabsTrigger value="import" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Help
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Data
                </CardTitle>
                <CardDescription>
                  Select a data type to import from CSV or JSON file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {DATA_TYPES.map((item) => (
                    <Card 
                      key={item.type} 
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleImport(item.type)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <item.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium">{item.label}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImport(item.type);
                          }}
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Import {item.label}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Data
                </CardTitle>
                <CardDescription>
                  Select a data type to export as CSV or JSON
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {DATA_TYPES.map((item) => (
                    <Card 
                      key={item.type} 
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleExport(item.type)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <item.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium">{item.label}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full mt-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExport(item.type);
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Export {item.label}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="help" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Import/Export Guide</CardTitle>
                <CardDescription>Learn how to prepare your data for import</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV Format
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    CSV files should have headers in the first row matching the field names. Example:
                  </p>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`full_name,email,phone,address
John Doe,john@example.com,555-1234,123 Main St
Jane Smith,jane@example.com,555-5678,456 Oak Ave`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    JSON Format
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    JSON files should contain an array of objects. Example:
                  </p>
                  <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto">
{`[
  {
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "555-1234"
  },
  {
    "full_name": "Jane Smith",
    "email": "jane@example.com"
  }
]`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Required Fields by Data Type</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Clients:</strong> full_name, email</p>
                    <p><strong>Projects:</strong> name</p>
                    <p><strong>Tickets:</strong> title</p>
                    <p><strong>Invoices:</strong> amount, due_date, client_id</p>
                    <p><strong>Estimates:</strong> amount, client_id</p>
                    <p><strong>Equipment:</strong> name</p>
                    <p><strong>Employees:</strong> full_name</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Tips</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Download a template for the correct field names</li>
                    <li>Dates should be in YYYY-MM-DD format</li>
                    <li>Currency amounts should be numbers without symbols</li>
                    <li>Use lowercase field names with underscores</li>
                    <li>Wrap values containing commas in quotes for CSV</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ImportDialog 
        open={importOpen} 
        onOpenChange={setImportOpen} 
        defaultDataType={selectedType}
      />
      <ExportDialog 
        open={exportOpen} 
        onOpenChange={setExportOpen} 
        defaultDataType={selectedType}
      />
    </AdminLayout>
  );
};

export default ImportExportPage;
