import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  produto: string;
  corredor: string;
  loja?: string;
}

interface ImageUploadProps {
  onProcessed: (items: Product[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onProcessed, isLoading, setIsLoading }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const extractTextFromImage = async (imageFile: File) => {
    try {
      console.log('[OCR] Iniciando processamento de imagem...');
      const result = await (window as any).Tesseract.recognize(
        imageFile,
        'por',
        {
          logger: m => console.log('[OCR] Progresso:', m),
          tessedit_pageseg_mode: 6,
        }
      );
      console.log('[OCR] Texto extraído com sucesso');
      return result.data.text;
    } catch (error) {
      console.error("[OCR] Erro:", error);
      throw new Error('Falha ao ler texto da imagem');
    }
  };

  const findExactMatches = async (text: string) => {
    try {
      console.log('[Supabase] Buscando produtos...');
      const { data: products, error } = await supabase
        .from('produto')  // Tabela corrigida
        .select('produto, corredor, loja');  // Colunas corrigidas

      if (error) {
        console.error('[Supabase] Erro na consulta:', error);
        throw new Error(`Erro no banco de dados: ${error.message}`);
      }

      if (!products || products.length === 0) {
        throw new Error('Nenhum produto cadastrado encontrado');
      }

      console.log(`[Supabase] ${products.length} produtos carregados`);

      const normalize = (str: string) => 
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

      const productMap = new Map<string, Product>();
      products.forEach(p => {
        if (p.produto) {  // Campo corrigido
          productMap.set(normalize(p.produto), {
            produto: p.produto,
            corredor: p.corredor || 'Corredor não especificado',
            loja: p.loja
          });
        }
      });

      const words = text.split(/\s+/)
        .map(word => word.replace(/[^a-zA-ZÀ-ú]/g, ''))
        .filter(word => word.length >= 3)
        .map(normalize);

      console.log('[Processamento] Palavras extraídas:', words);

      const matches: Product[] = [];
      const addedProducts = new Set<string>();

      words.forEach(word => {
        if (productMap.has(word) && !addedProducts.has(word)) {
          matches.push(productMap.get(word)!);
          addedProducts.add(word);
        }
      });

      console.log('[Processamento] Correspondências encontradas:', matches.length);
      return matches;

    } catch (error) {
      console.error('[Processamento] Erro:', error);
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
      if (!extractedText) {
        throw new Error('Nenhum texto reconhecido na imagem');
      }

      const matchedProducts = await findExactMatches(extractedText);
      
      if (matchedProducts.length > 0) {
        onProcessed(matchedProducts);
        toast({
          title: "Sucesso",
          description: `Encontrados ${matchedProducts.length} produtos no cupom`,
          variant: "default",
        });
      } else {
        toast({
          title: "Aviso",
          description: "Nenhum produto cadastrado encontrado no cupom",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('[Erro Geral]', error);
      toast({
        title: "Erro",
        description: error.message || "Erro desconhecido ao processar o cupom",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 border rounded-md p-4">
      <h3 className="text-lg font-medium">Ler cupom fiscal</h3>
      <p className="text-sm text-gray-500">
        Fotografe a seção de itens do cupom contendo produtos
      </p>
      
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

      <div className="text-xs text-gray-500">
        <p><strong>Dicas para melhor resultado:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Verifique se os produtos estão cadastrados na tabela "produto"</li>
          <li>Confira as colunas: produto, corredor e loja</li>
          <li>Garanta a conexão com o Supabase no arquivo de configuração</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUpload;
