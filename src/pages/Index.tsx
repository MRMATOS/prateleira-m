
import React, { useState, useEffect, useMemo } from 'react';
import SearchBar from '@/components/SearchBar';
import AisleList from '@/components/AisleList';
import { AisleProduct } from '@/types';
import { mockAisles } from '@/data/mockAisles';
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [aisles, setAisles] = useState<AisleProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Simulating a data fetch
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // This would be replaced with actual Supabase call
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulated delay
        setAisles(mockAisles);
        setError(null);
      } catch (err) {
        console.error('Error fetching aisles:', err);
        setError(err instanceof Error ? err : new Error('Erro ao buscar dados'));
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados dos corredores.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

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
        
        <SearchBar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          onClear={handleClearSearch}
        />
        
        <AisleList 
          aisles={filteredAisles} 
          isLoading={isLoading} 
          error={error} 
        />
      </div>
    </div>
  );
};

export default Index;
