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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const normalizeText = (text: string): string => {
    if (!text || typeof text !== 'string') return '';
    return text
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  };

  const extractTextFromImage = async (imageFile: File): Promise<string> => {
    try {
      console.log('[OCR] Iniciando processamento...');
      const result = await (window as any).Tesseract.recognize(
        imageFile,
        'por',
        {
          logger: m => console.log('[OCR] Progresso:', m),
          tessedit_pageseg_mode: 6,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÇÃÕÊÉÁÍÓÚÂÔÀ0123456789 ./-',
        }
      );
      console.log('[OCR] Texto extraído com sucesso');
      return result.data.text;
    } catch (error) {
      console.error("[OCR] Erro:", error);
      throw new Error('Falha ao ler texto do cupom');
    }
  };

  const processReceiptText = (text: string): string[] => {
    if (!text || typeof text !== 'string') return [];
    
    return text.split('\n')
      .filter(line => {
        if (!line || typeof line !== 'string') return false;
        const isProductLine = line.match(/[A-ZÇÃÕÊÉÁÍÓÚÂÔÀ]{3,}/);
        const isHeader = line.match(/CNPJ|IE|RUA|TOTAL|PROTOCOLO|CONSUMIDOR|Qtd|Valor/i);
        return isProductLine && !isHeader;
      })
      .flatMap(line => {
        const cleanLine = line
          ?.replace(/\d{13}/g, '')
          ?.replace(/\d+\sUN/gi, '')
          ?.replace(/\d+[\.,]\d{2}/g, '')
          ?.replace(/^\d+\s+/g, '')
          ?.trim() || '';
          
        return cleanLine ? cleanLine.split(/[\s\/-]+/).filter(Boolean) : [];
      })
      .map(word => normalizeText(word))
      .filter(word => typeof word === 'string' && word.length > 2);
  };

  const findProductMatches = async (receiptWords: string[]): Promise<Product[]> => {
    try {
      console.log('[Supabase] Buscando produtos...');
      const { data: products, error } = await supabase
        .from('produto')
        .select('corredor, produto, loja');

      if (error) throw error;
      if (!products || !Array.isArray(products)) throw new Error('Nenhum produto cadastrado');

      const productWordsMap = new Map<string, Product>();
      products.forEach(product => {
        if (!product.produto || typeof product.produto !== 'string') return;
        
        product.produto.split(/[,;]/).forEach(prod => {
          const normalized = normalizeText(prod);
          if (normalized) {
            normalized.split(/[\s\/-]+/).forEach(word => {
              if (typeof word === 'string' && word.length > 2) {
                productWordsMap.set(word, product);
              }
            });
          }
        });
      });

      const validReceiptWords = receiptWords.filter(word => 
        typeof word === 'string' && word.length > 2
      );

      const matches: Product[] = [];
      const added = new Set<string>();
      
      validReceiptWords.forEach(word => {
        if (productWordsMap.has(word) && !added.has(word)) {
          matches.push(productWordsMap.get(word)!);
          added.add(word);
        }
      });

      return matches;

    } catch (error) {
      console.error('[Erro] Processamento:', error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Erro",
        description: "Selecione uma imagem de cupom fiscal",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const extractedText = await extractTextFromImage(file);
      console.log('[Processamento] Texto extraído:', extractedText);

      const receiptWords = processReceiptText(extractedText);
      console.log('[Processamento] Palavras processadas:', receiptWords);

      const matches = await findProductMatches(receiptWords);
      console.log('[Processamento] Correspondências encontradas:', matches);

      if (matches.length > 0) {
        onProcessed(matches);
        toast({
          title: "Produtos encontrados!",
          description: `${matches.length} itens identificados: ${matches.slice(0, 3).map(p => p.produto).join(', ')}${matches.length > 3 ? '...' : ''}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Nenhum produto reconhecido",
          description: "Verifique se os produtos estão cadastrados corretamente",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('[Erro Geral]', error);
      toast({
        title: "Erro de processamento",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <div className="flex flex-col gap-4 border rounded-md p-4">
      <h3 className="text-lg font-medium">Identificador de Produtos</h3>
      <p className="text-sm text-gray-500">
        Fotografe o cupom fiscal para localizar produtos e corredores
      </p>

      <div className="flex flex-col gap-4">
        {previewUrl && (
          <div className="border rounded-md p-2 max-w-xs mx-auto">
            <img 
              src={previewUrl} 
              alt="Pré-visualização do cupom" 
              className="max-h-40 mx-auto"
            />
            <p className="text-xs text-center mt-2 text-gray-500">
              Visualização da imagem carregada
            </p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <input
            type="file"
            id="image"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            capture="environment"
          />
          <label 
            htmlFor="image" 
            className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Upload className="h-4 w-4" />
            {file ? file.name : "Selecionar cupom"}
          </label>
          
          <Button 
            onClick={handleUpload} 
            disabled={!file || isLoading}
            className="min-w-[150px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              "Identificar produtos"
            )}
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-2">
          <p><strong>Dicas para melhor reconhecimento:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cadastre produtos no singular e em maiúsculas (ex: "CAFE")</li>
            <li>Fotografe apenas a seção de itens do cupom</li>
            <li>Garanta que a imagem está nítida e bem iluminada</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
