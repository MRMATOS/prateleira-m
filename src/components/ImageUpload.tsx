
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

  const calculateSimilarity = (str1: string, str2: string) => {
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

  const findSimilarProducts = (extractedText: string, registeredProducts: string[], threshold = 0.7) => {
    const possibleItems = extractedText.split('\n')
      .filter(line => line.length > 3)
      .map(line => line.trim().replace(/\d/g, '').trim()); // remove números

    const matches: {
      extracted: string;
      matchedProduct: string;
      confidence: number;
    }[] = [];
    
    possibleItems.forEach(item => {
      registeredProducts.forEach(registeredProd => {
        const similarity = calculateSimilarity(item.toLowerCase(), registeredProd.toLowerCase());
        if (similarity >= threshold) {
          matches.push({
            extracted: item,
            matchedProduct: registeredProd,
            confidence: similarity
          });
        }
      });
    });

    // Remove duplicados e ordena por confiança
    return matches
      .filter((v, i, a) => a.findIndex(t => t.matchedProduct === v.matchedProduct) === i)
      .sort((a, b) => b.confidence - a.confidence);
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
        // Get product list from Supabase to compare with
        const { data: productData, error } = await supabase
          .from('produto')
          .select('produto');
        
        if (error) throw error;
        
        // Extract product names from the query result
        const registeredProducts = productData
          .filter(item => item.produto)
          .map(item => item.produto || '');
        
        // Process the extracted text
        const text = extractedText.toLowerCase();
        
        // First, try to find similar products using our enhanced algorithm
        const similarProducts = findSimilarProducts(extractedText, registeredProducts, 0.6);
        
        let finalItems: string[] = [];
        
        if (similarProducts.length > 0) {
          // Use matched products if found
          finalItems = similarProducts.map(match => match.matchedProduct);
          
          toast({
            title: "Sucesso",
            description: `${finalItems.length} itens identificados com correspondência`,
            variant: "default",
          });
        } else {
          // Fallback to the previous method if no matches
          // Split into words using spaces, commas and line breaks
          const words = text.split(/[\s,\n]+/);
          
          // Filter out irrelevant terms
          finalItems = words.filter(word => {
            // Remove numbers, dates, prices
            if (/^\d+([.,]\d+)?$/.test(word)) return false;
            
            // Remove common receipt terms
            const termsToFilter = ['total', 'cash', 'cnpj', 'receipt', 'valor', 'troco', 'cpf', 
                                'data', 'hora', 'caixa', 'operador', 'pagamento', 'item', 
                                'subtotal', 'desconto', 'venda', 'cupom', 'fiscal'];
            
            return !termsToFilter.includes(word);
          });
          
          toast({
            title: "Processamento alternativo",
            description: `${finalItems.length} itens extraídos da imagem (método padrão)`,
            variant: "default",
          });
        }
        
        // Send extracted items back to parent component
        onProcessed(finalItems);
        
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
