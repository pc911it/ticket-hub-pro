import { Button } from '@/components/ui/button';
import { useFloatingWidgets } from '@/contexts/FloatingWidgetsContext';
import { MessageCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FloatingWidgetsToggle() {
  const { minimized, toggleMinimized, hideWidgets } = useFloatingWidgets();

  // Don't show if widgets are hidden (dialog/sheet is open)
  if (hideWidgets) return null;

  return (
    <Button
      onClick={toggleMinimized}
      size="sm"
      variant="secondary"
      className={cn(
        "fixed bottom-6 right-6 z-50 h-10 rounded-full shadow-lg",
        "transition-all duration-200 hover:scale-105",
        "flex items-center gap-2 px-3"
      )}
      title={minimized ? "Show chat widgets" : "Hide chat widgets"}
    >
      <MessageCircle className="h-4 w-4" />
      {minimized ? (
        <>
          <span className="text-xs">Show</span>
          <ChevronUp className="h-3 w-3" />
        </>
      ) : (
        <>
          <span className="text-xs">Hide</span>
          <ChevronDown className="h-3 w-3" />
        </>
      )}
    </Button>
  );
}
