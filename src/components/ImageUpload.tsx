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

const ImageUpload: React.FC<ImageUploadProps> = ({ onProcessed, isLoading, setIsLoading }) => {
  // ... (código anterior mantido)

  const processReceiptText = (text: string) => {
    // Foco nas linhas que contêm produtos em maiúsculas
    const productLines = text.split('\n').filter(line => {
      return line.match(/[A-ZÀ-Ú\s]{5,}/) && // Linhas com palavras em maiúsculas
             !line.match(/CNPJ|IE|RUA|TOTAL|PROTOCOLO|CONSUMIDOR/i); // Ignora cabeçalho
    });

    // Extrai nomes dos produtos usando o padrão do cupom
    return productLines.map(line => {
      // Remove códigos e valores
      return line
        .replace(/\d{13}/g, '')      // Remove EAN
        .replace(/\d+\.?\d{2}/g, '') // Remove valores
        .replace(/\d+\s+UN/i, '')    // Remove quantidade
        .trim()
        .toLowerCase();
    });
  };

  const findMatches = async (text: string) => {
    try {
      // Busca produtos no Supabase
      const { data: products } = await supabase
        .from('produto')
        .select('corredor, produto, loja');

      // Processa texto do cupom
      const receiptProducts = processReceiptText(text);
      console.log('Produtos extraídos:', receiptProducts);

      // Normaliza produtos do banco
      const productMap = new Map<string, Product>();
      products?.forEach(p => {
        const normalized = p.produto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        productMap.set(normalized, p);
      });

      // Encontra correspondências
      return receiptProducts
        .map(prod => prod.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
        .filter(prod => productMap.has(prod))
        .map(prod => productMap.get(prod)!);
        
    } catch (error) {
      console.error('Erro:', error);
      throw error;
    }
  };

  const handleUpload = async () => {
    // ... (código anterior mantido)
    
    try {
      const extractedText = await extractTextFromImage(file);
      const matches = await findMatches(extractedText);

      if (matches.length > 0) {
        onProcessed(matches);
        toast({
          title: `${matches.length} produtos encontrados`,
          description: `Exemplo: ${matches[0].produto} (Corredor ${matches[0].corredor})`,
          variant: "default",
        });
      } else {
        toast({
          title: "Nenhum produto reconhecido",
          description: "Verifique se os produtos estão cadastrados",
          variant: "destructive",
        });
      }
    }
    // ... (restante do código mantido)
  };
};
