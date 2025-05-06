
import React, { useState } from 'react';
import { Menu, LogOut } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MenubarMenu,
  MenubarTrigger,
  Menubar,
  MenubarContent,
  MenubarItem,
} from "@/components/ui/menubar";
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/contexts/AdminContext';
import AdminLoginModal from './AdminLoginModal';

const HeaderMenu: React.FC = () => {
  const { isAdminMode, exitAdminMode } = useAdmin();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openLoginModal = () => {
    setIsLoginModalOpen(true);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    exitAdminMode();
    setMobileMenuOpen(false);
  };

  // Desktop menu
  const desktopMenu = (
    <Menubar className="border-none shadow-none">
      <MenubarMenu>
        <MenubarTrigger className="cursor-pointer">
          <Menu className="h-6 w-6" />
        </MenubarTrigger>
        <MenubarContent>
          {!isAdminMode ? (
            <MenubarItem onClick={openLoginModal}>
              Administrador
            </MenubarItem>
          ) : (
            <MenubarItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair do modo administrador
            </MenubarItem>
          )}
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );

  // Mobile menu
  const mobileMenu = (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="lg:hidden p-0 h-auto">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-4">
          {!isAdminMode ? (
            <Button variant="outline" onClick={openLoginModal}>
              Administrador
            </Button>
          ) : (
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair do modo administrador
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      <div className="hidden sm:block">{desktopMenu}</div>
      <div className="sm:hidden">{mobileMenu}</div>
      
      <AdminLoginModal 
        open={isLoginModalOpen} 
        onOpenChange={setIsLoginModalOpen} 
      />
    </>
  );
};

export default HeaderMenu;
