
import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImageUploadProps {
  onProcessed: (items: string[]) => void;
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
      // @ts-ignore - Tesseract is added via CDN
      const result = await window.Tesseract.recognize(
        imageFile,
        'por', // Portuguese language
        { logger: progress => console.log('OCR Progress:', progress) }
      );
      
      return result.data.text;
    } catch (error) {
      console.error("Error in OCR:", error);
      return null;
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Erro",
        description: "Selecione uma imagem para upload",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Process the image using Tesseract.js
      const extractedText = await extractTextFromImage(file);
      
      if (extractedText) {
        // Process the extracted text
        const text = extractedText.toLowerCase();
        
        // Split into words using spaces, commas and line breaks
        const words = text.split(/[\s,\n]+/);
        
        // Filter out irrelevant terms
        const filteredWords = words.filter(word => {
          // Remove numbers, dates, prices
          if (/^\d+([.,]\d+)?$/.test(word)) return false;
          
          // Remove common receipt terms
          const termsToFilter = ['total', 'cash', 'cnpj', 'receipt', 'valor', 'troco', 'cpf', 
                              'data', 'hora', 'caixa', 'operador', 'pagamento', 'item', 
                              'subtotal', 'desconto', 'venda', 'cupom', 'fiscal'];
          
          return !termsToFilter.includes(word);
        });
        
        // Send extracted items back to parent component
        onProcessed(filteredWords);
        
        toast({
          title: "Sucesso",
          description: `${filteredWords.length} itens extraídos da imagem`,
          variant: "default",
        });
      } else {
        throw new Error('No text extracted from the image');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar a imagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 border rounded-md p-4">
      <h3 className="text-lg font-medium">Carregar imagem</h3>
      <p className="text-sm text-gray-500">
        Carregue uma foto de um cupom fiscal ou lista de compras manuscrita
      </p>
      
      <div className="flex items-center gap-4">
        <input
          type="file"
          id="image"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <label 
          htmlFor="image" 
          className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Upload className="h-4 w-4" />
          {file ? file.name : "Selecionar imagem"}
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
            "Processar imagem"
          )}
        </Button>
      </div>
    </div>
  );
};

export default ImageUpload;
