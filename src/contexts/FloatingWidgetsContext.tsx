import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FloatingWidgetsContextType {
  hideWidgets: boolean;
  setHideWidgets: (hide: boolean) => void;
}

const FloatingWidgetsContext = createContext<FloatingWidgetsContextType | undefined>(undefined);

export function FloatingWidgetsProvider({ children }: { children: ReactNode }) {
  const [hideWidgets, setHideWidgets] = useState(false);

  return (
    <FloatingWidgetsContext.Provider value={{ hideWidgets, setHideWidgets }}>
      {children}
    </FloatingWidgetsContext.Provider>
  );
}

export function useFloatingWidgets() {
  const context = useContext(FloatingWidgetsContext);
  if (!context) {
    // Return a default if used outside provider
    return { hideWidgets: false, setHideWidgets: () => {} };
  }
  return context;
}
