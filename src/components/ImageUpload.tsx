// src/components/ui/ImageUpload.tsx
'use client';

import { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';

interface Product {
  corredor: number;
  produto: string;
  loja: string;
}

export default function ImageUpload() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Product[]>([]);

  const normalizeText = (text: string) => {
    return text
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  };

  const processReceiptText = (text: string) => {
    return text.split('\n')
      .filter(line => {
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
    
    try {
      // OCR Processing
      const { data: { text } } = await window.Tesseract.recognize(
        file,
        'por',
        {
          logger: m => console.log('OCR Progress:', m),
          tessedit_pageseg_mode: 6,
        }
      );

      // Process matches
      const receiptWords = processReceiptText(text);
      const { data: products } = await supabase
        .from('produto')
        .select('corredor, produto, loja');

      const productMap = new Map<string, Product>();
      products?.forEach(p => {
        p.produto.split(/[,;]/).forEach(prod => {
          normalizeText(prod).split(/\s+/).forEach(word => {
            if (word.length > 2) productMap.set(word, p);
          });
        });
      });

      const matches: Product[] = [];
      const added = new Set<string>();
      
      receiptWords.forEach(word => {
        if (productMap.has(word) && !added.has(word)) {
          matches.push(productMap.get(word)!);
          added.add(word);
        }
      });

      setResults(matches);
      toast({
        title: matches.length ? 'Sucesso!' : 'Aviso',
        description: matches.length 
          ? `${matches.length} produtos identificados`
          : 'Nenhum produto cadastrado encontrado',
      });

    } catch (error) {
      console.error('Erro:', error);
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
    <div className="w-full max-w-2xl space-y-6">
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

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Resultados da Busca</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {results.map((item, index) => (
              <div key={index} className="p-4 border rounded-lg bg-card">
                <h4 className="font-medium">{item.produto}</h4>
                <div className="text-sm text-muted-foreground mt-2">
                  <p>Corredor: {item.corredor}</p>
                  <p>Loja: {item.loja}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
