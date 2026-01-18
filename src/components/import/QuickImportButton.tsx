import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Upload, Download, ChevronDown } from 'lucide-react';
import { ImportDialog, ImportDataType } from './ImportDialog';
import { ExportDialog } from './ExportDialog';

interface QuickImportButtonProps {
  dataType: ImportDataType;
  onImportComplete?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showExport?: boolean;
}

export const QuickImportButton = ({
  dataType,
  onImportComplete,
  variant = 'outline',
  size = 'sm',
  showExport = true,
}: QuickImportButtonProps) => {
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  if (!showExport) {
    return (
      <>
        <Button variant={variant} size={size} onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-1" />
          Import
        </Button>
        <ImportDialog 
          open={importOpen} 
          onOpenChange={setImportOpen} 
          defaultDataType={dataType}
          onImportComplete={onImportComplete}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size}>
            <Upload className="h-4 w-4 mr-1" />
            Import/Export
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import from File
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export to File
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ImportDialog 
        open={importOpen} 
        onOpenChange={setImportOpen} 
        defaultDataType={dataType}
        onImportComplete={onImportComplete}
      />
      <ExportDialog 
        open={exportOpen} 
        onOpenChange={setExportOpen} 
        defaultDataType={dataType}
      />
    </>
  );
};
