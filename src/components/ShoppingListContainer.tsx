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

// src/components/ShoppingListContainer.tsx
const generateRoute = (itemsList: string[], products: AisleProduct[]) => {
  const matchedItems = new Map<number, string[]>();
  const notMatched: string[] = [];

  // Função de normalização reforçada
  const normalize = (text: string) => {
    return String(text) // Garante conversão para string
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Mantém apenas letras e números
      .trim();
  };

  itemsList.forEach(item => {
    const cleanItem = normalize(item);
    let matched = false;

    for (const product of products) {
      if (!product.produtos) continue;

      // Processamento seguro dos produtos
      const productItems = product.produtos
        .split(/[,\s]+/)
        .map(p => normalize(p))
        .filter(p => p.length > 0);

      // Comparação invulnerável
      const hasMatch = productItems.some(prodItem => {
        return cleanItem === prodItem || 
               prodItem.includes(cleanItem) || 
               cleanItem.includes(prodItem);
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

    if (!matched) notMatched.push(item);
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
              const newItems = [...items, ...extractedItems.filter(i => typeof i === 'string')]; // Filtro extra
              setItems(newItems);
              generateRoute(newItems, aisleProducts);
            }}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
          <ManualItemEntry onAddItem={(item: string) => {
            if (typeof item === 'string') { // Validação adicional
              const newItems = [...items, item];
              setItems(newItems);
              generateRoute(newItems, aisleProducts);
            }
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
                const allItems = [
                  ...shoppingRoute.flatMap(r => r.itens),
                  ...unmatchedItems
                ].filter(i => typeof i === 'string'); // Filtro final

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
