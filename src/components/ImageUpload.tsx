
// src/components/ui/ImageUpload.tsx
'use client';

import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImageUploadProps {
  onProcessed: (items: string[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function ImageUpload({ onProcessed, isLoading, setIsLoading }: ImageUploadProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);

  const normalizeText = (text: string) => {
    if (typeof text !== 'string') return '';
    
    return text
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  };

  const processReceiptText = (text: string) => {
    if (typeof text !== 'string') return [];
    
    return text.split('\n')
      .filter(line => {
        if (typeof line !== 'string') return false;
        
        const isProduct = line.match(/[A-ZÇÃÕÊÉÁÍÓÚÂÔÀ]{3,}/);
        const isHeader = line.match(/CNPJ|IE|RUA|TOTAL|PROTOCOLO|CONSUMIDOR|Qtd|Valor/i);
        return isProduct && !isHeader;
      })
      .flatMap(line => {
        const cleanLine = line
          .replace(/\d{13}/g, '')
          .replace(/\d+\sUN/gi, '')
          .replace(/\d+[.,]\d{2}/g, '')
          .replace(/^\d+\s+/g, '')
          .trim();
          
        return cleanLine.split(/[\s/-]+/).filter(Boolean);
      })
      .map(word => normalizeText(word))
      .filter(word => word.length > 2);
  };

  // Função para calcular similaridade entre duas strings
  const calculateSimilarity = (str1: string, str2: string): number => {
    if (typeof str1 !== 'string' || typeof str2 !== 'string') return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length <= str2.length ? str1 : str2;
    const lengthDiff = longer.length - shorter.length;
    
    if (lengthDiff > longer.length * 0.3) return 0; // diferença muito grande
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    
    return matches / longer.length;
  };

  // Função para encontrar produtos similares na base de dados
  const findSimilarProducts = async (extractedWords: string[], threshold = 0.6) => {
    try {
      // Busca todos os produtos do banco
      const { data: productsData, error } = await supabase
        .from('produto')
        .select('produto');
      
      if (error) throw error;

      // Extrai palavras dos produtos cadastrados
      const registeredProducts = productsData
        .filter(p => p.produto && typeof p.produto === 'string')
        .flatMap(p => p.produto!.split(/[,;]/)
          .map(word => normalizeText(word))
          .filter(word => word.length > 2)
        );
      
      // Encontra correspondências
      const matches = new Set<string>();
      
      for (const word of extractedWords) {
        if (!word || typeof word !== 'string') continue;
        
        let found = false;
        for (const prod of registeredProducts) {
          if (!prod || typeof prod !== 'string') continue;
          
          const similarity = calculateSimilarity(word, prod);
          if (similarity >= threshold || 
             (prod.length > 2 && word.includes(prod)) || 
             (word.length > 2 && prod.includes(word))
          ) {
            matches.add(word);
            found = true;
            break;
          }
        }
        
        // Se a palavra for maior que 4 caracteres, podemos considerar como um possível item
        if (!found && word.length > 4) {
          matches.add(word);
        }
      }
      
      return Array.from(matches);
      
    } catch (error) {
      console.error("Erro ao buscar produtos similares:", error);
      return [];
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: 'Erro',
        description: 'Selecione uma imagem de cupom fiscal',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    console.log('[OCR] Iniciando processamento');
    
    try {
      // OCR Processing usando Window.Tesseract
      if (!window.Tesseract) {
        throw new Error("Tesseract não está disponível");
      }
      
      // Log para acompanhar o progresso
      const ocrResult = await window.Tesseract.recognize(
        file,
        'por',
        {
          logger: m => console.log('[OCR] Progresso:', m),
          tessedit_pageseg_mode: 6,
        }
      );

      const extractedText = ocrResult?.data?.text || "";
      console.log('[OCR] Texto extraído com sucesso');
      console.log('[Processamento] Texto extraído:', extractedText);

      // Extração de palavras do texto
      const extractedWords = processReceiptText(extractedText);
      console.log('[Processamento] Palavras processadas:', extractedWords);

      // Busca por produtos similares
      console.log('[Supabase] Buscando produtos...');
      const matchedProducts = await findSimilarProducts(extractedWords);
      
      // Verifica se temos produtos encontrados
      if (matchedProducts.length > 0) {
        console.log('[Processamento] Produtos encontrados:', matchedProducts);
        onProcessed(matchedProducts);
        
        toast({
          title: 'Sucesso!',
          description: `${matchedProducts.length} produtos identificados`,
          variant: 'default',
        });
      } else {
        // Se não encontrou correspondências, usa as palavras extraídas diretamente
        console.log('[Processamento] Nenhuma correspondência encontrada, usando palavras extraídas.');
        onProcessed(extractedWords);
        
        toast({
          title: 'Aviso',
          description: 'Itens extraídos sem correspondência direta',
          variant: 'default',
        });
      }

    } catch (error) {
      console.error('[Erro Geral]', error);
      toast({
        title: 'Erro de processamento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-md p-4 bg-white shadow-sm">
      <h3 className="text-lg font-medium mb-4">Upload de Cupom Fiscal</h3>
      <div className="flex gap-4 items-center">
        <input
          type="file"
          id="image"
          accept="image/*"
          className="hidden"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />
        <label
          htmlFor="image"
          className="flex-1 cursor-pointer flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          <Upload className="h-4 w-4" />
          {file ? file.name : 'Selecionar cupom'}
        </label>
        
        <Button 
          onClick={handleUpload}
          disabled={!file || isLoading}
          className="min-w-[120px]"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Processando...' : 'Analisar'}
        </Button>
      </div>
    </div>
  );
}
