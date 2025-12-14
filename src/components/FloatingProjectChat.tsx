import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MessageCircle, X } from 'lucide-react';
import { ProjectChat } from './ProjectChat';
import { cn } from '@/lib/utils';

interface FloatingProjectChatProps {
  projectId: string;
  projectName: string;
}

export function FloatingProjectChat({ projectId, projectName }: FloatingProjectChatProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className={cn(
            "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            "transition-all duration-200 hover:scale-105",
            isOpen && "scale-0 opacity-0"
          )}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b bg-background">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            {projectName} Chat
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden p-4">
          <ProjectChat projectId={projectId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
