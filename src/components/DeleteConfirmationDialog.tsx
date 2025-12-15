import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  itemType: 'project' | 'ticket' | 'client' | 'item';
  description?: string;
  loading?: boolean;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  itemName,
  itemType,
  description,
  loading = false,
}: DeleteConfirmationDialogProps) {
  const warningMessages = {
    project: 'This will permanently delete the project and all associated data including tickets, milestones, and attachments.',
    ticket: 'This will permanently delete the ticket and all associated materials and attachments.',
    client: 'This will permanently delete the client record. Any tickets associated with this client may be affected.',
    item: 'This action cannot be undone.',
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">Delete {title}?</AlertDialogTitle>
          </div>
          <div className="pt-4 space-y-3">
            <div className="p-3 bg-muted rounded-lg border">
              <p className="text-sm text-muted-foreground">You are about to delete:</p>
              <p className="font-semibold text-foreground mt-1 truncate">{itemName}</p>
            </div>
            <p className="text-destructive font-medium">
              {description || warningMessages[itemType]}
            </p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
