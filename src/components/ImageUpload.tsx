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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Configurações do Tesseract para diferentes tipos de imagem
  const tesseractConfig = {
    receipt: {
      lang: 'por',
      options: {
        tessedit_pageseg_mode: 6, // Modo para documentos estruturados
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZÇÃÕÊÉÁÍÓÚÂÔÀáéíóúâêôãõç.-/ ',
      }
    },
    list: {
      lang: 'por',
      options: {
        tessedit_pageseg_mode: 3, // Modo para texto automático
        preserve_interword_spaces: 0
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  // Pré-processamento básico de imagem
  const preprocessImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // Mantém proporção original
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Aplica filtros básicos
          ctx.filter = 'contrast(1.1) brightness(1.1)';
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            resolve(blob || new Blob([], { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.9);
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Detecta se é um cupom fiscal ou lista comum
  const detectImageType = async (imageBlob: Blob): Promise<'receipt' | 'list'> => {
    // Implementação simplificada - pode ser aprimorada
    return 'receipt'; // Assume que é cupom por padrão
  };

  // Extrai texto com configurações apropriadas
  const extractText = async (imageFile: File) => {
    const processedImage = await preprocessImage(imageFile);
    const imageType = await detectImageType(processedImage);
    const config = tesseractConfig[imageType];

    const result = await (window as any).Tesseract.recognize(
      processedImage,
      config.lang,
      {
        logger: (m: any) => console.log('OCR Progress:', m),
        ...config.options
      }
    );
    
    return {
      text: result.data.text,
      type: imageType
    };
  };

  // Processamento específico para cupons fiscais
  const processReceipt = (text: string) => {
    const lines = text.split('\n')
      .filter(line => line.trim().length > 5) // Ignora linhas muito curtas
      .map(line => line.trim());

    // Padrão comum em cupons: código | descrição | quantidade | valor
    const productLines = lines.filter(line => {
      return line.match(/\d{10,14}\s+.+\s+\d+\s+[A-Z]+\s+\d+,\d{2}/) || // Código de barras
             line.match(/^\d+\s+.+\s+\d+,\d{2}$/); // Formato simples
    });

    // Extrai apenas a descrição do produto
    return productLines.map(line => {
      // Remove código, valores e quantidades
      return line
        .replace(/^\d+\s+/, '') // Remove número do item
        .replace(/\d{10,14}\s+/, '') // Remove código de barras
        .replace(/\s+\d+([.,]\d+)?$/, '') // Remove valores no final
        .replace(/\s+\d+\s+[A-Z]+\s+\d+,\d{2}$/, '') // Remove qtd + valor
        .trim();
    });
  };

  // Processamento para listas comuns
  const processList = (text: string) => {
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 2) // Ignora linhas muito curtas
      .filter(line => !line.match(/^\d+$/) // Ignora números sozinhos
      .filter(line => !line.match(/[R$]\s?\d+/)); // Ignora valores
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
      const { text, type } = await extractText(file);
      console.log(`Texto extraído (${type}):`, text);

      let items: string[] = [];
      
      if (type === 'receipt') {
        items = processReceipt(text);
        if (items.length === 0) {
          // Fallback para processamento genérico se não encontrar padrão de cupom
          items = processList(text);
        }
      } else {
        items = processList(text);
      }

      // Filtra itens vazios e duplicados
      const filteredItems = items
        .filter(item => item.length > 0)
        .filter((item, index, self) => self.indexOf(item) === index);

      if (filteredItems.length > 0) {
        onProcessed(filteredItems);
        toast({
          title: "Sucesso",
          description: `${filteredItems.length} itens identificados`,
          variant: "default",
        });
      } else {
        throw new Error('Nenhum item reconhecido');
      }

    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Erro",
        description: "Não foi possível identificar itens na imagem. Tente novamente com uma foto mais nítida.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 border rounded-md p-4">
      <h3 className="text-lg font-medium">Carregar imagem</h3>
      <p className="text-sm text-gray-500">
        Carregue uma foto de um cupom fiscal ou lista de compras
      </p>
      
      <div className="flex flex-col gap-4">
        {previewUrl && (
          <div className="border rounded-md p-2 max-w-xs mx-auto">
            <img 
              src={previewUrl} 
              alt="Pré-visualização" 
              className="max-h-40 mx-auto"
            />
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
            {file ? file.name : "Selecionar imagem"}
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
              "Processar imagem"
            )}
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Para cupons: fotografe a seção de itens</p>
          <p>• Para listas: garanta boa iluminação</p>
          <p>• Evite reflexos e sombras</p>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
