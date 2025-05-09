import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  corredor: number;
  produto: string;
  loja: string;
}

interface ImageUploadProps {
  onProcessed: (items: Product[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onProcessed, isLoading, setIsLoading }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);

  // ... handleFileChange permanece igual

  const findExactMatches = async (text: string) => {
    try {
      console.log('[Supabase] Buscando produtos...');
      const { data: products, error } = await supabase
        .from('produto')
        .select('corredor, produto, loja'); // Ordem corrigida

      if (error) throw error;

      const normalize = (str: string) => 
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
           .toLowerCase()
           .replace(/[^a-z0-9\s]/g, '');

      // Cria mapa de produtos normalizados
      const productMap = new Map<string, Product>();
      
      products?.forEach(p => {
        // Divide produtos múltiplos em entradas separadas
        p.produto.split(',').forEach(prod => {
          const cleanProd = prod.trim();
          if (cleanProd) {
            productMap.set(normalize(cleanProd), {
              corredor: p.corredor,
              produto: cleanProd,
              loja: p.loja
            });
          }
        });
      });

      // Processa texto do cupom
      const extractedItems = text.split('\n')
        .flatMap(line => line.split(/[,.]/)) // Divide por vírgulas e pontos
        .map(item => normalize(item.trim()))
        .filter(item => item.length > 3);

      console.log('Itens extraídos:', extractedItems);

      // Encontra correspondências
      const matches: Product[] = [];
      const addedProducts = new Set<string>();

      extractedItems.forEach(item => {
        if (productMap.has(item) && !addedProducts.has(item)) {
          matches.push(productMap.get(item)!);
          addedProducts.add(item);
        }
      });

      return matches;

    } catch (error) {
      console.error('Erro na busca:', error);
      throw error;
    }
  };

  // ... resto do código permanece igual
};
