
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RouteItem {
  corredor: number;
  itens: string[];
}

interface ShoppingRouteTableProps {
  route: RouteItem[];
  rawItems: string[];
  onRefresh: () => void;
}

const ShoppingRouteTable: React.FC<ShoppingRouteTableProps> = ({ route, rawItems, onRefresh }) => {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  if (!route || route.length === 0) {
    return null;
  }

  const handleEdit = async (item: string) => {
    if (editingItem === item) {
      // Save changes
      try {
        const { error } = await supabase
          .from('list')
          .update({ item: editValue })
          .eq('item', item);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Item atualizado com sucesso",
          variant: "default",
        });
        
        setEditingItem(null);
        onRefresh();
      } catch (error) {
        console.error('Error updating item:', error);
        toast({
          title: "Erro",
          description: "Falha ao atualizar o item",
          variant: "destructive",
        });
      }
    } else {
      // Start editing
      setEditingItem(item);
      setEditValue(item);
    }
  };

  const handleDelete = async (item: string) => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('list')
        .delete()
        .eq('item', item);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Item removido com sucesso",
        variant: "default",
      });
      
      onRefresh();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover o item",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderItemActions = (item: string) => {
    if (editingItem === item) {
      return (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="px-2 py-1 border rounded-md text-sm"
            autoFocus
          />
          <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
            Salvar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>
            Cancelar
          </Button>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2">
        <span>{item}</span>
        <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => handleDelete(item)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };
  
  return (
    <div className="mt-6">
      <Tabs defaultValue="route">
        <TabsList className="mb-4">
          <TabsTrigger value="route">Rota de compras</TabsTrigger>
          <TabsTrigger value="items">Itens não classificados</TabsTrigger>
        </TabsList>
        
        <TabsContent value="route">
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Corredor</TableHead>
                  <TableHead>Produtos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {route.map((item) => (
                  <TableRow key={item.corredor}>
                    <TableCell className="font-medium">{item.corredor}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {item.itens.map((itemName, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            {renderItemActions(itemName)}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="items">
          <div className="border rounded-md p-4">
            <h3 className="font-medium mb-2">Itens não encontrados nos corredores:</h3>
            <div className="flex flex-wrap gap-2">
              {rawItems.length > 0 ? (
                rawItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-md text-sm">
                    {renderItemActions(item)}
                  </div>
                ))
              ) : (
                <p className="text-gray-500">Todos os itens foram classificados!</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShoppingRouteTable;
