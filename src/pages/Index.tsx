import React, { useState, useMemo, useEffect } from 'react';
import SearchBar from '@/components/SearchBar';
import AisleList from '@/components/AisleList';
import HeaderMenu from '@/components/HeaderMenu';
import AdminControls from '@/components/AdminControls';
import StoreSelect from '@/components/StoreSelect';
import ShoppingListButton from '@/components/ShoppingListButton';
import { AisleProduct } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from '@tanstack/react-query';
import { AdminProvider } from '@/contexts/AdminContext';

// Define initial store list - this can be expanded as needed
const INITIAL_STORES = [
  'Dal Pozzo Vila Bela',
  'Dal Pozzo Cidade dos Lagos',
  'Dal Pozzo Home Center'
];

const fetchAisles = async (selectedStore: string) => {
  const { data, error } = await supabase
    .from('produto')
    .select('corredor, produto, loja')
    .eq('loja', selectedStore)
    .order('corredor', { ascending: true });

  if (error) {
    throw error;
  }

  // Transform the data to match the AisleProduct type
  return data.map(item => ({
    corredor: item.corredor,
    produtos: item.produto || '', // Handle potentially null produto values
    loja: item.loja
  }));
};

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState(INITIAL_STORES[0]);
  const { toast } = useToast();

  // Use React Query to fetch and cache the data
  const { data: aisles = [], isLoading, error, refetch } = useQuery({
    queryKey: ['aisles', selectedStore],
    queryFn: () => fetchAisles(selectedStore)
  });
  
  // Handle errors outside of the useQuery options
  React.useEffect(() => {
    if (error) {
      console.error('Error fetching aisles:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados dos corredores.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const filteredAisles = useMemo(() => {
    if (!searchQuery.trim()) {
      return aisles;
    }

    // Case-insensitive search
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    return aisles.filter(aisle => 
      aisle.produtos.toLowerCase().includes(normalizedQuery)
    );
  }, [aisles, searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <AdminProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <header className="mb-8 flex justify-between items-center">
            <h1 className="text-3xl font-semibold text-gray-700">Consulta de produtos</h1>
            <HeaderMenu />
          </header>
          
          <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
            <StoreSelect 
              selectedStore={selectedStore} 
              setSelectedStore={setSelectedStore} 
              stores={INITIAL_STORES} 
            />
            <ShoppingListButton />
          </div>
          
          <AdminControls selectedStore={selectedStore} />
          
          <div className="fixed-search-container">
            <SearchBar 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery} 
              onClear={handleClearSearch}
            />
          </div>
          
          <div className="mt-4">
            <AisleList 
              aisles={filteredAisles} 
              isLoading={isLoading} 
              error={error instanceof Error ? error : error ? new Error(String(error)) : null} 
            />
          </div>
        </div>
      </div>
    </AdminProvider>
  );
};

export default Index;
