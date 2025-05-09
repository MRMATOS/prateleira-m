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

  // CORREÇÃO CHAVE: Função de geração de rota segura
  const generateRoute = (itemsList: string[], products: AisleProduct[]) => {
    const matchedItems = new Map<number, string[]>();
    const notMatched: string[] = [];

    itemsList.forEach(item => {
      let matched = false;
      
      for (const product of products) {
        if (!product.produtos) continue;
        
        const productItems = product.produtos
          .toLowerCase()
          .split(/[,\s]+/)
          .filter(Boolean);

        const hasMatch = productItems.some(prodItem => {
          // Verificação de tipo explícita
          if (typeof prodItem !== 'string' || typeof item !== 'string') return false;
          return prodItem.includes(item) || item.includes(prodItem);
        });

        if (hasMatch) {
          const corridor = product.corredor;
          matchedItems.set(corridor, [...(matchedItems.get(corridor) || []), item].filter((v, i, a) => a.indexOf(v) === i));
          matched = true;
          break;
        }
      }
      
      if (!matched) notMatched.push(item);
    });

    const sortedRoute = Array.from(matchedItems.entries())
      .map(([corredor, itens]) => ({ corredor, itens }))
      .sort((a, b) => a.corredor - b.corredor);

    setShoppingRoute(sortedRoute);
    setUnmatchedItems(notMatched);
  };

  // ... (mantido o restante do código original sem alterações)

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
              const newItems = [...items, ...extractedItems];
              setItems(newItems);
              generateRoute(newItems, aisleProducts);
            }}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
          <ManualItemEntry onAddItem={(item: string) => {
            const newItems = [...items, item];
            setItems(newItems);
            generateRoute(newItems, aisleProducts);
          }} />
          <ShoppingRouteTable 
            route={shoppingRoute} 
            rawItems={unmatchedItems} 
            onRefresh={fetchAisleProducts}
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
                const allItems = shoppingRoute.flatMap(r => r.itens).concat(unmatchedItems);
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
