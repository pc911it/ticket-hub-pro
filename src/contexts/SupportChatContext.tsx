import { createContext, useContext, useState, ReactNode } from 'react';

interface SupportChatContextType {
  openChat: () => void;
  closeChat: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const SupportChatContext = createContext<SupportChatContextType | undefined>(undefined);

export function SupportChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);

  return (
    <SupportChatContext.Provider value={{ openChat, closeChat, isOpen, setIsOpen }}>
      {children}
    </SupportChatContext.Provider>
  );
}

export function useSupportChat() {
  const context = useContext(SupportChatContext);
  if (context === undefined) {
    throw new Error('useSupportChat must be used within a SupportChatProvider');
  }
  return context;
}
