import { createContext, useContext, useState, ReactNode } from "react";

interface NavigationBarContextType {
  hoveredItem: string | null;
  setHoveredItem: (id: string | null) => void;
}

const NavigationBarContext = createContext<NavigationBarContextType | undefined>(
  undefined
);

export function NavigationBarProvider({ children }: { children: ReactNode }) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
  return (
    <NavigationBarContext.Provider value={{ hoveredItem, setHoveredItem }}>
      {children}
    </NavigationBarContext.Provider>
  );
}

export function useNavigationBar() {
  const context = useContext(NavigationBarContext);
  if (context === undefined) {
    throw new Error(
      "useNavigationBar must be used within a NavigationBarProvider"
    );
  }
  return context;
}
