
import React, { useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useAdmin } from '@/contexts/AdminContext';
import AddShelfModal from './AddShelfModal';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';

const AdminControls: React.FC = () => {
  const { isAdminMode, exitAdminMode } = useAdmin();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!isAdminMode) return null;

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['aisles'] });
    toast({
      title: "Alterações salvas",
      description: "Lista de corredores atualizada.",
      variant: "default",
    });
  };

  return (
    <div className="flex flex-wrap gap-2 my-4">
      <Button 
        onClick={() => setIsAddModalOpen(true)}
        className="bg-green-500 hover:bg-green-600 text-white"
      >
        <Plus className="mr-2 h-4 w-4" /> Adicionar corredor
      </Button>
      
      <Button 
        onClick={refreshData}
        className="bg-blue-500 hover:bg-blue-600 text-white"
      >
        <Save className="mr-2 h-4 w-4" /> Salvar alterações
      </Button>
      
      <Button 
        onClick={exitAdminMode}
        variant="outline"
        className="ml-auto"
      >
        Sair do modo administrador
      </Button>

      <AddShelfModal 
        open={isAddModalOpen} 
        onOpenChange={setIsAddModalOpen} 
        onSuccess={refreshData}
      />
    </div>
  );
};

export default AdminControls;
