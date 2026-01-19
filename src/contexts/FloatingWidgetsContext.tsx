import { createContext, useContext, useState, ReactNode } from 'react';

interface FloatingWidgetsContextType {
  hideWidgets: boolean;
  setHideWidgets: (hide: boolean) => void;
  minimized: boolean;
  setMinimized: (min: boolean) => void;
  toggleMinimized: () => void;
}

const FloatingWidgetsContext = createContext<FloatingWidgetsContextType | undefined>(undefined);

export function FloatingWidgetsProvider({ children }: { children: ReactNode }) {
  const [hideWidgets, setHideWidgets] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const toggleMinimized = () => setMinimized(prev => !prev);

  return (
    <FloatingWidgetsContext.Provider value={{ hideWidgets, setHideWidgets, minimized, setMinimized, toggleMinimized }}>
      {children}
    </FloatingWidgetsContext.Provider>
  );
}

export function useFloatingWidgets() {
  const context = useContext(FloatingWidgetsContext);
  if (!context) {
    // Return a default if used outside provider
    return { hideWidgets: false, setHideWidgets: () => {}, minimized: false, setMinimized: () => {}, toggleMinimized: () => {} };
  }
  return context;
}
