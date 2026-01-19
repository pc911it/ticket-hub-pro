import { useAuth } from '@/hooks/useAuth';
import { GlobalAIAssistant } from '@/components/ai/GlobalAIAssistant';

interface AIAssistantProviderProps {
  children: React.ReactNode;
}

export function AIAssistantProvider({ children }: AIAssistantProviderProps) {
  const { user } = useAuth();

  return (
    <>
      {children}
      {user && <GlobalAIAssistant />}
    </>
  );
}
