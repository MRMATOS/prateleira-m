
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

interface AdminContextType {
  isAdminMode: boolean;
  authenticateAdmin: (password: string) => boolean;
  exitAdminMode: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const { toast } = useToast();
  
  // Use a hashed password in a real production app
  // This is just a temporary solution for demo purposes
  const ADMIN_PASSWORD = "442288";
  
  // Check local storage on mount to restore admin state
  useEffect(() => {
    const storedAdminMode = localStorage.getItem('isAdminMode');
    if (storedAdminMode === 'true') {
      setIsAdminMode(true);
    }
  }, []);
  
  const authenticateAdmin = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdminMode(true);
      localStorage.setItem('isAdminMode', 'true');
      toast({
        title: "Modo administrador ativado",
        variant: "default",
      });
      return true;
    } else {
      toast({
        title: "Senha incorreta",
        variant: "destructive",
      });
      return false;
    }
  };
  
  const exitAdminMode = () => {
    setIsAdminMode(false);
    localStorage.removeItem('isAdminMode');
    toast({
      title: "Modo administrador desativado",
      variant: "default",
    });
  };
  
  return (
    <AdminContext.Provider value={{ isAdminMode, authenticateAdmin, exitAdminMode }}>
      {children}
    </AdminContext.Provider>
  );
};
