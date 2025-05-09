import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImageUploadProps {
  onProcessed: (items: {name: string, aisle: string}[]) => void;
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
      console.log('Iniciando OCR...');
      const result = await (window as any).Tesseract.recognize(
        imageFile,
        'por',
        {
          logger: m => console.log('Progresso OCR:', m),
          tessedit_pageseg_mode: 6,
        }
      );
      console.log('OCR concluído com sucesso');
      return result.data.text;
    } catch (error) {
      console.error("Erro no OCR:", error);
      throw new Error('Falha ao ler texto da imagem');
    }
  };

  const findExactMatches = async (text: string) => {
    try {
      console.log('Buscando produtos no Supabase...');
      const { data: products, error } = await supabase
        .from('produtos')
        .select('nome, corredor');
      
      if (error) {
        console.error('Erro Supabase:', error);
        throw error;
      }

      if (!products || products.length === 0) {
        throw new Error('Nenhum produto cadastrado encontrado');
      }

      console.log(`${products.length} produtos carregados do Supabase`);

      const normalize = (str: string) => 
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

      const productMap = new Map<string, string>();
      products.forEach(p => {
        if (p.nome) {
          productMap.set(normalize(p.nome), p.corredor || 'Corredor não especificado');
        }
      });

      const words = text.split(/\s+/)
        .map(word => word.replace(/[^a-zA-ZÀ-ú]/g, '')) // Remove símbolos e números
        .filter(word => word.length >= 3) // Palavras com 3+ letras
        .map(normalize);

      console.log('Palavras extraídas:', words);

      const matches: {name: string, aisle: string}[] = [];
      const addedProducts = new Set<string>();

      words.forEach(word => {
        if (productMap.has(word) && !addedProducts.has(word)) {
          const originalName = products.find(p => normalize(p.nome) === word)?.nome || word;
          matches.push({
            name: originalName,
            aisle: productMap.get(word)!
          });
          addedProducts.add(word);
        }
      });

      console.log(`${matches.length} correspondências encontradas`);
      return matches;

    } catch (error) {
      console.error('Erro na busca de produtos:', error);
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
      // 1. Extração de texto
      const extractedText = await extractTextFromImage(file);
      if (!extractedText) {
        throw new Error('Nenhum texto foi extraído da imagem');
      }

      // 2. Busca de correspondências
      const matchedProducts = await findExactMatches(extractedText);
      
      // 3. Resultados
      if (matchedProducts.length > 0) {
        onProcessed(matchedProducts);
        toast({
          title: "Sucesso",
          description: `Encontramos ${matchedProducts.length} produto(s) no cupom`,
          variant: "default",
        });
      } else {
        toast({
          title: "Aviso",
          description: "Nenhum produto cadastrado foi encontrado no cupom",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Erro no processamento:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao processar o cupom fiscal",
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
        Fotografe a seção de itens do cupom fiscal para identificar produtos
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
        <p><strong>Verifique antes de enviar:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>A imagem está nítida e legível</li>
          <li>Os produtos estão cadastrados no sistema</li>
          <li>Você está fotografando apenas a área de itens</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUpload;
