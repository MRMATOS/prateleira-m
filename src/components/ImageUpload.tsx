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
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  };

  const extractTextFromImage = async (imageFile: File) => {
    try {
      const result = await (window as any).Tesseract.recognize(
        imageFile,
        'por',
        {
          logger: m => console.log('OCR Progress:', m),
          tessedit_pageseg_mode: 6,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÇÃÕÊÉÁÍÓÚÂÔÀ0123456789 ./-',
        }
      );
      return result.data.text;
    } catch (error) {
      console.error("Error in OCR:", error);
      throw new Error('Falha ao ler texto do cupom');
    }
  };

  const processReceiptText = (text: string) => {
    return text.split('\n')
      .filter(line => {
        // Filtra linhas relevantes
        const hasProduct = line.match(/[A-ZÇÃÕÊÉÁÍÓÚÂÔÀ]{5,}/);
        const isHeader = line.match(/CNPJ|IE|RUA|TOTAL|PROTOCOLO|CONSUMIDOR|Qtd|Valor/i);
        return hasProduct && !isHeader;
      })
      .map(line => {
        // Limpeza avançada da linha
        return line
          .replace(/\d{13}/g, '')       // Remove EAN
          .replace(/\d+\sUN/g, '')      // Remove quantidade
          .replace(/\d+[\.,]\d{2}/g, '') // Remove valores
          .replace(/^\d+\s+/g, '')      // Remove número do item
          .trim();
      });
  };

  const findMatches = async (text: string) => {
    try {
      // Busca produtos cadastrados
      const { data: products, error } = await supabase
        .from('produto')
        .select('corredor, produto, loja');

      if (error) throw error;
      if (!products || products.length === 0) throw new Error('Nenhum produto cadastrado');

      // Processa texto do cupom
      const receiptItems = processReceiptText(text)
        .map(item => normalizeText(item))
        .filter(item => item.length > 3);

      console.log('Itens processados:', receiptItems);

      // Cria mapa de produtos normalizados
      const productMap = new Map<string, Product>();
      products.forEach(p => {
        const cleanProducts = p.produto.split(/[,;]/).map(prod => normalizeText(prod.trim()));
        cleanProducts.forEach(prod => {
          productMap.set(prod, p);
        });
      });

      // Encontra correspondências
      const matches: Product[] = [];
      const added = new Set<string>();

      receiptItems.forEach(item => {
        const normalizedItem = normalizeText(item);
        if (productMap.has(normalizedItem) && !added.has(normalizedItem)) {
          matches.push(productMap.get(normalizedItem)!);
          added.add(normalizedItem);
        }
      });

      return matches;

    } catch (error) {
      console.error('Erro no processamento:', error);
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
      console.log('Texto extraído:', extractedText);

      const matchedProducts = await findMatches(extractedText);
      
      if (matchedProducts.length > 0) {
        onProcessed(matchedProducts);
        toast({
          title: "Produtos identificados",
          description: `Encontrados ${matchedProducts.length} produtos: ${matchedProducts.map(p => p.produto).join(', ')}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Nenhum produto reconhecido",
          description: "Verifique se os produtos estão cadastrados no formato exato do cupom",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro geral:', error);
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
      <h3 className="text-lg font-medium">Leitor de Cupons Fiscais</h3>
      <p className="text-sm text-gray-500">
        Fotografe a seção de itens do cupom fiscal (formato padrão brasileiro)
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
              Pré-visualização do cupom
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
          <p><strong>Requisitos para bom funcionamento:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Os produtos devem estar cadastrados exatamente como aparecem no cupom</li>
            <li>Formato esperado: Coluna 'produto' com nomes em maiúsculas</li>
            <li>Exemplo: 'FILTRO DE PAPEL BOM JESU' no cupom → 'Filtro de Papel Bom Jesu' no banco</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
