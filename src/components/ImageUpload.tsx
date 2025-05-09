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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  // Função para normalizar texto (remove acentos, caracteres especiais)
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, '');
  };

  const calculateSimilarity = (str1: string, str2: string) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length <= str2.length ? str1 : str2;
    
    if (longer.length === 0) return 1.0;
    
    const lengthDiff = longer.length - shorter.length;
    if (lengthDiff > longer.length * 0.3) return 0;
    
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }
    
    return matches / longer.length;
  };

  // PRÉ-PROCESSAMENTO DE IMAGEM (NOVO)
  const preprocessImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // Ajustar tamanho mantendo proporção
          const MAX_SIZE = 2000;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Aplicar filtros para melhorar OCR (especialmente para cupons)
          ctx.filter = 'contrast(1.2) brightness(1.1) grayscale(100%)';
          ctx.drawImage(img, 0, 0, width, height);
          
          // Converter para Blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(new Blob([], { type: 'image/jpeg' }));
            }
          }, 'image/jpeg', 0.8);
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // OCR APRIMORADO (NOVO)
  const extractTextFromImage = async (imageFile: File) => {
    try {
      // Pré-processa a imagem antes do OCR
      const processedImage = await preprocessImage(imageFile);
      
      // Configurações otimizadas para cupons fiscais
      const result = await (window as any).Tesseract.recognize(
        processedImage,
        'por+eng', // Usa português e inglês como fallback
        {
          logger: (m: any) => console.log('OCR Progress:', m),
          tessedit_pageseg_mode: 6, // Modo de segmentação para blocos únicos (ótimo para cupons)
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZÇÃÕÊÉÁÍÓÚÂÔÀáéíóúâêôãõç.-/ ', // Caracteres esperados
          preserve_interword_spaces: 1 // Mantém espaçamento para melhorar reconhecimento de colunas
        }
      );
      
      return result.data.text;
    } catch (error) {
      console.error("Error in OCR:", error);
      return null;
    }
  };

  // BUSCA DE PRODUTOS APRIMORADA (NOVO)
  const findProductsInText = (extractedText: string, registeredProducts: string[]) => {
    const lines = extractedText.split('\n')
      .filter(line => line.trim().length > 3) // Remove linhas muito curtas
      .map(line => line.replace(/\s{2,}/g, ' ').trim()); // Normaliza espaços

    const results: Array<{
      product: string;
      originalText: string;
      confidence: number;
    }> = [];
    
    // Primeiro busca por correspondências exatas
    registeredProducts.forEach(product => {
      const normalizedProduct = normalizeText(product);
      
      lines.forEach(line => {
        const normalizedLine = normalizeText(line);
        
        // Verifica se o produto aparece na linha (match exato)
        if (normalizedLine.includes(normalizedProduct)) {
          results.push({
            product,
            originalText: line,
            confidence: 1
          });
        }
      });
    });

    // Se não encontrou matches exatos, usa similaridade
    if (results.length === 0) {
      registeredProducts.forEach(product => {
        const normalizedProduct = normalizeText(product);
        
        lines.forEach(line => {
          const normalizedLine = normalizeText(line);
          const similarity = calculateSimilarity(normalizedLine, normalizedProduct);
          
          if (similarity > 0.7) {
            results.push({
              product,
              originalText: line,
              confidence: similarity
            });
          }
        });
      });
    }

    // Remove duplicados e ordena por confiança
    const uniqueResults = results.filter((result, index, self) =>
      index === self.findIndex((t) => t.product === result.product)
    ).sort((a, b) => b.confidence - a.confidence);

    return uniqueResults;
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
      // Processa a imagem usando Tesseract.js com pré-processamento
      const extractedText = await extractTextFromImage(file);
      
      if (extractedText) {
        console.log("Texto extraído:", extractedText);
        
        // Obtém lista de produtos do Supabase
        const { data: productData, error } = await supabase
          .from('produto')
          .select('produto');
        
        if (error) throw error;
        
        // Extrai nomes dos produtos
        const registeredProducts = productData
          .filter(item => item.produto)
          .map(item => item.produto || '');
        
        // Processa o texto extraído (versão aprimorada)
        const matchedProducts = findProductsInText(extractedText, registeredProducts);
        
        let finalItems: string[] = [];
        
        if (matchedProducts.length > 0) {
          finalItems = matchedProducts.map(match => match.product);
          
          toast({
            title: "Sucesso",
            description: `${finalItems.length} itens identificados`,
            variant: "default",
          });
        } else {
          // Fallback para extração simples (se nenhum match for encontrado)
          const text = extractedText.toLowerCase();
          const words = text.split(/[\s,\n]+/);
          
          // Filtra termos irrelevantes (específico para cupons)
          const termsToFilter = [
            'total', 'cash', 'cnpj', 'receipt', 'valor', 'troco', 'cpf', 
            'data', 'hora', 'caixa', 'operador', 'pagamento', 'item', 
            'subtotal', 'desconto', 'venda', 'cupom', 'fiscal', 'documento',
            'auxiliar', 'nota', 'consumidor', 'eletronica', 'ie', 'protocolo'
          ];
          
          finalItems = words
            .filter(word => {
              if (/^\d+([.,]\d+)?$/.test(word)) return false;
              return !termsToFilter.includes(word);
            })
            .filter((word, index, self) => self.indexOf(word) === index); // Remove duplicados
          
          toast({
            title: "Processamento básico",
            description: `${finalItems.length} itens extraídos (sem correspondência exata)`,
            variant: "default",
          });
        }
        
        // Envia itens extraídos para o componente pai
        onProcessed(finalItems);
        
      } else {
        throw new Error('Nenhum texto extraído da imagem');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      toast({
        title: "Erro",
        description: "Falha ao processar a imagem. Tente novamente com uma foto mais nítida.",
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
        Carregue uma foto de um cupom fiscal ou lista de compras manuscrita
      </p>
      
      <div className="flex flex-col gap-4">
        {/* Pré-visualização da imagem (NOVO) */}
        {previewUrl && (
          <div className="border rounded-md p-2 max-w-xs mx-auto">
            <img 
              src={previewUrl} 
              alt="Pré-visualização" 
              className="max-h-40 mx-auto"
            />
            <p className="text-xs text-center mt-2 text-gray-500">
              Pré-visualização da imagem
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
            capture="environment" // Melhor para fotos de cupons no celular
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
        
        <p className="text-xs text-gray-500">
          Dica: Fotografe o cupom em boa luz e evite reflexos para melhor reconhecimento.
        </p>
      </div>
    </div>
  );
};

export default ImageUpload;
