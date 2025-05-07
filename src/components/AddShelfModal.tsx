
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AddShelfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  selectedStore: string;
}

const AddShelfModal: React.FC<AddShelfModalProps> = ({ open, onOpenChange, onSuccess, selectedStore }) => {
  const [corredor, setCorredor] = useState<number | ''>('');
  const [produtos, setProdutos] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (corredor === '') {
      toast({
        title: "Erro",
        description: "O número do corredor é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('produto')
        .insert([{ 
          corredor: Number(corredor), 
          produto: produtos,
          loja: selectedStore
        }]);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Corredor adicionado com sucesso.",
        variant: "default",
      });
      
      // Reset form and close modal
      setCorredor('');
      setProdutos('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error adding shelf:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o corredor.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Corredor em {selectedStore}</DialogTitle>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="corredor" className="text-sm font-medium">
              Número do Corredor
            </label>
            <Input
              id="corredor"
              type="number"
              value={corredor}
              onChange={(e) => setCorredor(e.target.value ? Number(e.target.value) : '')}
              required
              min="1"
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="produtos" className="text-sm font-medium">
              Produtos
            </label>
            <Textarea
              id="produtos"
              value={produtos}
              onChange={(e) => setProdutos(e.target.value)}
              placeholder="Lista de produtos separados por vírgula"
              className="w-full min-h-[100px]"
            />
          </div>
          
          <div className="flex justify-end">
            <Button 
              type="submit" 
              className="bg-green-500 hover:bg-green-600"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddShelfModal;
