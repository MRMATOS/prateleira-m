
import React, { useState, useMemo } from 'react';
import SearchBar from '@/components/SearchBar';
import AisleList from '@/components/AisleList';
import { AisleProduct } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from '@tanstack/react-query';

const fetchAisles = async () => {
  const { data, error } = await supabase
    .from('produto')
    .select('corredor, produto')
    .order('corredor', { ascending: true });

  if (error) {
    throw error;
  }

  // Transform the data to match the AisleProduct type
  return data.map(item => ({
    corredor: item.corredor,
    produtos: item.produto || '' // Handle potentially null produto values
  }));
};

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  // Use React Query to fetch and cache the data
  const { data: aisles = [], isLoading, error } = useQuery({
    queryKey: ['aisles'],
    queryFn: fetchAisles
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="mb-8">
          <h1 className="mb-8 text-3xl font-semibold text-gray-700">Consulta de produtos</h1>
        </header>
        
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
  );
};

export default Index;
