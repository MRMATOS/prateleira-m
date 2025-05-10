
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AisleProduct } from '@/types';
import StoreSelect from '@/components/StoreSelect';
import ImageUpload from '@/components/ImageUpload';
import ManualItemEntry from '@/components/ManualItemEntry';
import ShoppingRouteTable from '@/components/ShoppingRouteTable';
import ShoppingActionButtons from '@/components/ShoppingActionButtons';
import ShoppingListHeader from '@/components/ShoppingListHeader';

const INITIAL_STORES = [
  'Dal Pozzo Vila Bela',
  'Dal Pozzo Cidade dos Lagos',
  'Dal Pozzo Home Center'
];

const ShoppingListContainer = () => {
  const { toast } = useToast();
  const [selectedStore, setSelectedStore] = useState(INITIAL_STORES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [aisleProducts, setAisleProducts] = useState<AisleProduct[]>([]);
  const [shoppingRoute, setShoppingRoute] = useState<{corredor: number; itens: string[]}[]>([]);
  const [unmatchedItems, setUnmatchedItems] = useState<string[]>([]);

  const fetchAisleProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('produto')
        .select('corredor, produto, loja')
        .eq('loja', selectedStore)
        .order('corredor', { ascending: true });

      if (error) throw error;

      const products = data.map(item => ({
        corredor: item.corredor,
        produtos: item.produto || '',
        loja: item.loja
      }));

      setAisleProducts(products);
      if (items.length > 0) generateRoute(items, products);
    } catch (error) {
      console.error('Error fetching aisles:', error);
      toast({ title: "Erro", description: "Erro ao carregar corredores", variant: "destructive" });
    }
  };

  useEffect(() => { fetchAisleProducts(); }, [selectedStore]);

  // Função para normalizar texto - remove acentos, converte para minúsculas, remove caracteres especiais
  const normalize = (text: string) => {
    if (typeof text !== 'string') return '';
    
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Mantém apenas letras e números
      .trim();
  };

  // Função para calcular similaridade entre duas palavras
  const calculateSimilarity = (str1: string, str2: string) => {
    if (typeof str1 !== 'string' || typeof str2 !== 'string') return 0;
    
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

  const generateRoute = (itemsList: string[], products: AisleProduct[]) => {
    const matchedItems = new Map<number, string[]>();
    const notMatched: string[] = [];

    itemsList.forEach(item => {
      if (typeof item !== 'string' || item.trim() === '') {
        return; // Ignora itens inválidos
      }
      
      const cleanItem = normalize(item);
      let matched = false;

      for (const product of products) {
        if (!product.produtos || typeof product.produtos !== 'string') continue;

        // Processamento seguro dos produtos
        const productItems = product.produtos
          .split(/[,\s]+/)
          .map(p => normalize(p))
          .filter(p => p.length > 0);

        // Verifica por correspondência exata ou parcial
        const hasMatch = productItems.some(prodItem => {
          if (typeof prodItem !== 'string' || typeof cleanItem !== 'string') return false;
          
          // Verifica se há correspondência exata ou parcial
          const exactMatch = cleanItem === prodItem;
          const partialMatch = (prodItem.length > 2 && cleanItem.includes(prodItem)) || 
                              (cleanItem.length > 2 && prodItem.includes(cleanItem));
          const similarityMatch = calculateSimilarity(cleanItem, prodItem) >= 0.7;
          
          return exactMatch || partialMatch || similarityMatch;
        });

        if (hasMatch) {
          const corridor = product.corredor;
          const currentItems = matchedItems.get(corridor) || [];
          if (!currentItems.includes(item)) {
            matchedItems.set(corridor, [...currentItems, item]);
          }
          matched = true;
          break;
        }
      }

      if (!matched && item.trim() !== '') {
        notMatched.push(item);
      }
    });

    const sortedRoute = Array.from(matchedItems.entries())
      .map(([corredor, itens]) => ({ corredor, itens }))
      .sort((a, b) => a.corredor - b.corredor);

    setShoppingRoute(sortedRoute);
    setUnmatchedItems(notMatched);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <ShoppingListHeader />
        <div className="mb-6">
          <StoreSelect 
            selectedStore={selectedStore} 
            setSelectedStore={setSelectedStore} 
            stores={INITIAL_STORES} 
          />
        </div>
        <div className="space-y-6">
          <ImageUpload 
            onProcessed={(extractedItems: string[]) => {
              // Valida os itens antes de adicioná-los
              const validItems = extractedItems.filter(item => 
                typeof item === 'string' && item.trim() !== ''
              );
              
              // Verifica se há itens válidos
              if (validItems.length > 0) {
                const newItems = [...items, ...validItems];
                setItems(newItems);
                generateRoute(newItems, aisleProducts);
              } else {
                toast({ 
                  title: "Aviso", 
                  description: "Nenhum item válido encontrado", 
                  variant: "default" 
                });
              }
            }}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
          <ManualItemEntry onAddItem={(item: string) => {
            // Validação do item antes de adicionar
            if (typeof item === 'string' && item.trim() !== '') {
              const newItems = [...items, item];
              setItems(newItems);
              generateRoute(newItems, aisleProducts);
            } else {
              toast({ 
                title: "Aviso", 
                description: "Item inválido", 
                variant: "default" 
              });
            }
          }} />
          <ShoppingRouteTable 
            route={shoppingRoute} 
            rawItems={unmatchedItems} 
            onRefresh={() => {
              // Reprocessa todos os itens quando há alteração
              generateRoute(items, aisleProducts);
            }}
            onDeleteItem={(item: string) => {
              // Remove o item da lista
              const newItems = items.filter(i => i !== item);
              setItems(newItems);
              // Regenera a rota com os itens restantes
              generateRoute(newItems, aisleProducts);
            }}
            onEditItem={(oldItem: string, newItem: string) => {
              // Substitui o item antigo pelo novo
              const newItems = items.map(i => i === oldItem ? newItem : i);
              setItems(newItems);
              // Regenera a rota com os novos itens
              generateRoute(newItems, aisleProducts);
            }}
          />
          <ShoppingActionButtons
            isSaving={isSaving}
            onSave={async () => {
              if (shoppingRoute.length === 0 && unmatchedItems.length === 0) {
                toast({ title: "Aviso", description: "Lista vazia", variant: "default" });
                return;
              }

              setIsSaving(true);
              try {
                const allItems = [
                  ...shoppingRoute.flatMap(r => r.itens),
                  ...unmatchedItems
                ].filter(i => typeof i === 'string' && i.trim() !== '');

                await Promise.all(allItems.map(item => 
                  supabase.from('list').insert({ item, origem: selectedStore, quantidade: 1 })
                ));
                
                toast({ title: "Sucesso", description: "Lista salva!", variant: "default" });
                setItems([]);
                setShoppingRoute([]);
                setUnmatchedItems([]);
              } catch (error) {
                toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" });
              } finally {
                setIsSaving(false);
              }
            }}
            showSaveButton={shoppingRoute.length > 0 || unmatchedItems.length > 0}
          />
        </div>
      </div>
    </div>
  );
};

export default ShoppingListContainer;
