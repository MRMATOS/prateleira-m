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

  const normalizeText = (text: string) => {
    return text
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .trim();
  };

  const extractTextFromImage = async (imageFile: File) => {
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

  const processReceiptText = (text: string) => {
    return text.split('\n')
      .filter(line => {
        // Filtra linhas relevantes
        const isProductLine = line.match(/[A-ZÇÃÕÊÉÁÍÓÚÂÔÀ]{3,}/);
        const isHeader = line.match(/CNPJ|IE|RUA|TOTAL|PROTOCOLO|CONSUMIDOR|Qtd|Valor/i);
        return isProductLine && !isHeader;
      })
      .flatMap(line => {
        // Processa cada linha do cupom
        const cleanLine = line
          .replace(/\d{13}/g, '') // Remove EAN
          .replace(/\d+\sUN/gi, '') // Remove unidade
          .replace(/\d+[\.,]\d{2}/g, '') // Remove valores
          .replace(/^\d+\s+/g, '') // Remove número do item
          .trim();
          
        return cleanLine.split(/[\s\/-]+/); // Divide em palavras
      })
      .map(word => normalizeText(word))
      .filter(word => word.length > 2);
  };

  const findProductMatches = async (receiptWords: string[]) => {
    try {
      console.log('[Supabase] Buscando produtos...');
      const { data: products, error } = await supabase
        .from('produto')
        .select('corredor, produto, loja');

      if (error) throw error;
      if (!products || products.length === 0) throw new Error('Nenhum produto cadastrado');

      console.log('[Supabase] Produtos carregados:', products);

      // Prepara palavras dos produtos cadastrados
      const productWordsMap = new Map<string, Product>();
      products.forEach(product => {
        product.produto.split(/[,;]/).forEach(prod => {
          normalizeText(prod)
            .split(/[\s\/-]+/)
            .forEach(word => {
              if (word.length > 2) {
                productWordsMap.set(word, product);
              }
            });
        });
      });

      // Encontra correspondências
      const matches: Product[] = [];
      const added = new Set<string>();
      
      receiptWords.forEach(word => {
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
      // 1. Extrair texto
      const extractedText = await extractTextFromImage(file);
      console.log('[Processamento] Texto extraído:', extractedText);

      // 2. Processar texto
      const receiptWords = processReceiptText(extractedText);
      console.log('[Processamento] Palavras processadas:', receiptWords);

      // 3. Buscar correspondências
      const matches = await findProductMatches(receiptWords);
      console.log('[Processamento] Correspondências encontradas:', matches);

      // 4. Resultados
      if (matches.length > 0) {
        onProcessed(matches);
        toast({
          title: "Produtos encontrados!",
          description: `${matches.length} itens identificados: ${matches.map(p => p.produto).join(', ')}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Nenhum produto reconhecido",
          description: "Adicione os produtos ao sistema ou verifique o cadastro",
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
          <p><strong>Instruções de cadastro:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cadastre produtos no Singular (ex: "CAFE" ao invés de "CAFÉ MELITTA")</li>
            <li>Use a coluna 'produto' para palavras-chave principais</li>
            <li>Exemplo: Para reconhecer "CAFE MELITTA TRADICION", cadastre "CAFE" e "MELITTA" separadamente</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
