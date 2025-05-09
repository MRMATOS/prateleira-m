import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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
      // Configuração simplificada para listas
      const result = await (window as any).Tesseract.recognize(
        imageFile,
        'por',
        {
          logger: m => console.log('OCR Progress:', m),
          tessedit_pageseg_mode: 3, // Modo automático para texto simples
          preserve_interword_spaces: 0,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÇÃÕÊÉÁÍÓÚÂÔÀáéíóúâêôãõç0123456789- '
        }
      );
      
      return result.data.text;
    } catch (error) {
      console.error("Error in OCR:", error);
      return null;
    }
  };

  const processListText = (text: string) => {
    if (!text) return [];
    
    // Processamento otimizado para listas
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Filtros básicos
        const lowerLine = line.toLowerCase();
        return (
          line.length > 2 && // Remove linhas muito curtas
          !/^\d+$/.test(line) && // Remove números isolados
          !/\d+[,.]\d{2}/.test(line) && // Remove valores (R$ 1,99)
          !/total|subtotal|quantidade|valor/i.test(lowerLine) && // Remove termos comuns
          !/[@#]/.test(line) // Remove caracteres especiais
        );
      });
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
      const extractedText = await extractTextFromImage(file);
      
      if (extractedText) {
        console.log("Texto extraído:", extractedText);
        
        const items = processListText(extractedText)
          .filter((item, index, self) => self.indexOf(item) === index); // Remove duplicados

        if (items.length > 0) {
          onProcessed(items);
          toast({
            title: "Itens identificados",
            description: `Encontramos ${items.length} itens na sua lista`,
            variant: "default",
          });
        } else {
          toast({
            title: "Atenção",
            description: "Não encontramos itens válidos na imagem. Tente novamente com uma foto mais nítida.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar a imagem",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 border rounded-md p-4">
      <h3 className="text-lg font-medium">Carregar lista</h3>
      <p className="text-sm text-gray-500">
        Fotografe sua lista de compras manuscrita ou digital
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
            "Ler lista"
          )}
        </Button>
      </div>

      <div className="text-xs text-gray-500">
        <p><strong>Dicas para melhor resultado:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Escreva cada item em uma linha separada</li>
          <li>Use letras legíveis e evite cursivas muito complexas</li>
          <li>Fotografe em boa luz com fundo uniforme</li>
          <li>Mantenha a câmera paralela à lista</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageUpload;
