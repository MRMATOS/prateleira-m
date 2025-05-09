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
      const result = await (window as any).Tesseract.recognize(
        imageFile,
        'por',
        {
          logger: m => console.log('OCR Progress:', m),
          tessedit_pageseg_mode: 6, // Modo para cupons fiscais
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZÇÃÕÊÉÁÍÓÚÂÔÀáéíóúâêôãõç.-/ ',
        }
      );
      return result.data.text;
    } catch (error) {
      console.error("Error in OCR:", error);
      return null;
    }
  };

  const findExactMatches = async (text: string) => {
    // 1. Normaliza o texto (remove acentos, pontuação)
    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    
    // 2. Obtém TODOS os produtos do Supabase com seus corredores
    const { data: products, error } = await supabase
      .from('produtos')
      .select('nome, corredor');
    
    if (error) throw error;
    
    // 3. Cria um mapa de produtos normalizados
    const productMap = new Map<string, string>();
    products.forEach(p => {
      if (p.nome) {
        productMap.set(normalize(p.nome), p.corredor || 'Corredor não especificado');
      }
    });
    
    // 4. Extrai palavras do texto (ignorando números e valores)
    const words = text.split(/\s+/)
      .filter(word => word.length > 3) // Ignora palavras muito curtas
      .filter(word => !/\d/.test(word)) // Ignora palavras com números
      .map(normalize);
    
    // 5. Encontra correspondências exatas
    const matches: {name: string, aisle: string}[] = [];
    const addedProducts = new Set<string>();
    
    words.forEach(word => {
      if (productMap.has(word) && !addedProducts.has(word)) {
        matches.push({
          name: products.find(p => normalize(p.nome) === word)!.nome,
          aisle: productMap.get(word)!
        });
        addedProducts.add(word);
      }
    });
    
    return matches;
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
      
      if (extractedText) {
        console.log("Texto extraído:", extractedText);
        
        const matchedProducts = await findExactMatches(extractedText);
        
        if (matchedProducts.length > 0) {
          onProcessed(matchedProducts);
          toast({
            title: "Produtos encontrados",
            description: `Identificamos ${matchedProducts.length} produtos no cupom`,
            variant: "default",
          });
        } else {
          toast({
            title: "Atenção",
            description: "Nenhum produto cadastrado foi encontrado no cupom",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar o cupom fiscal",
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
        Fotografe a seção de itens do cupom fiscal para identificar produtos e corredores
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
        <p><strong>Instruções para melhor reconhecimento:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Fotografe apenas a seção de itens do cupom</li>
          <li>Mantenha o cupom plano e bem iluminado</li>
          <li>Evite dobras ou sombras na área dos produtos</li>
          <li>Certifique-se que os produtos estão cadastrados no sistema</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUpload;
