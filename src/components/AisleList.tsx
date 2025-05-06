
import React, { useState } from 'react';
import { AisleListProps, AisleProduct } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAdmin } from '@/contexts/AdminContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AisleList = ({ aisles, isLoading, error }: AisleListProps) => {
  const { isAdminMode } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingAisle, setEditingAisle] = useState<number | null>(null);
  const [editedProdutos, setEditedProdutos] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [aisleToDelete, setAisleToDelete] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="animate-pulse text-lg text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700">
        <p>Erro ao carregar dados: {error.message}</p>
      </div>
    );
  }

  if (aisles.length === 0) {
    return (
      <div className="mt-6 rounded-md bg-gray-50 p-6 text-center text-gray-700">
        <p className="text-lg">Nenhuma prateleira encontrada para esse produto.</p>
      </div>
    );
  }

  const handleEditClick = (aisle: AisleProduct) => {
    setEditingAisle(aisle.corredor);
    setEditedProdutos(aisle.produtos);
  };

  const handleCancelEdit = () => {
    setEditingAisle(null);
    setEditedProdutos('');
  };

  const handleSaveEdit = async () => {
    if (!editingAisle) return;

    try {
      const { error } = await supabase
        .from('produto')
        .update({ produto: editedProdutos })
        .eq('corredor', editingAisle);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Corredor atualizado com sucesso.",
        variant: "default",
      });

      queryClient.invalidateQueries({ queryKey: ['aisles'] });
      setEditingAisle(null);
    } catch (error) {
      console.error('Error updating shelf:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o corredor.",
        variant: "destructive",
      });
    }
  };

  const openDeleteDialog = (corredor: number) => {
    setAisleToDelete(corredor);
    setDeleteDialogOpen(true);
  };

  const handleDeleteAisle = async () => {
    if (!aisleToDelete) return;

    try {
      const { error } = await supabase
        .from('produto')
        .delete()
        .eq('corredor', aisleToDelete);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Corredor excluído com sucesso.",
        variant: "default",
      });

      queryClient.invalidateQueries({ queryKey: ['aisles'] });
    } catch (error) {
      console.error('Error deleting shelf:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o corredor.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setAisleToDelete(null);
    }
  };

  return (
    <>
      <div className="mt-4 rounded-md border border-gray-200 bg-white p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Corredor</TableHead>
              <TableHead>Produtos</TableHead>
              {isAdminMode && <TableHead className="w-24 text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {aisles.map((aisle) => (
              <TableRow key={aisle.corredor}>
                <TableCell className="font-medium">{aisle.corredor}</TableCell>
                
                {editingAisle === aisle.corredor ? (
                  <TableCell>
                    <Textarea
                      value={editedProdutos}
                      onChange={(e) => setEditedProdutos(e.target.value)}
                      className="w-full min-h-[100px]"
                    />
                  </TableCell>
                ) : (
                  <TableCell>{aisle.produtos}</TableCell>
                )}
                
                {isAdminMode && (
                  <TableCell className="text-right">
                    {editingAisle === aisle.corredor ? (
                      <div className="flex justify-end space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={handleSaveEdit}
                          className="h-8 w-8 p-0 text-green-500"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={handleCancelEdit}
                          className="h-8 w-8 p-0 text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleEditClick(aisle)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => openDeleteDialog(aisle.corredor)}
                          className="h-8 w-8 p-0 text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir este corredor? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAisle}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AisleList;
