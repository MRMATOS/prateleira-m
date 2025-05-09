
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

  // Fetch aisle products for the selected store
  const fetchAisleProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('produto')
        .select('corredor, produto, loja')
        .eq('loja', selectedStore)
        .order('corredor', { ascending: true });

      if (error) throw error;

      // Transform the data to match the AisleProduct type
      const products = data.map(item => ({
        corredor: item.corredor,
        produtos: item.produto || '',
        loja: item.loja
      }));

      setAisleProducts(products);
      
      // If items already exist, recalculate the route
      if (items.length > 0) {
        generateRoute(items, products);
      }
    } catch (error) {
      console.error('Error fetching aisles:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados dos corredores.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAisleProducts();
  }, [selectedStore]);

  const handleImageProcessed = (extractedItems: string[]) => {
    setItems([...items, ...extractedItems]);
    generateRoute([...items, ...extractedItems], aisleProducts);
  };

  const handleAddItem = (item: string) => {
    const newItems = [...items, item];
    setItems(newItems);
    generateRoute(newItems, aisleProducts);
  };

  const generateRoute = (itemsList: string[], products: AisleProduct[]) => {
    const matchedItems = new Map<number, string[]>();
    const notMatched: string[] = [];

    itemsList.forEach(item => {
      let matched = false;
      
      for (const product of products) {
        if (!product.produtos) continue;
        
        const productItems = product.produtos.toLowerCase().split(/[,\s]+/);
        
        if (productItems.some(prodItem => prodItem.includes(item) || item.includes(prodItem))) {
          const corridor = product.corredor;
          
          if (!matchedItems.has(corridor)) {
            matchedItems.set(corridor, []);
          }
          
          // Avoid duplicates
          if (!matchedItems.get(corridor)?.includes(item)) {
            matchedItems.get(corridor)?.push(item);
          }
          
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        notMatched.push(item);
      }
    });

    // Sort by corridor number
    const sortedRoute = Array.from(matchedItems.entries())
      .map(([corredor, itens]) => ({ corredor, itens }))
      .sort((a, b) => a.corredor - b.corredor);

    setShoppingRoute(sortedRoute);
    setUnmatchedItems(notMatched);
  };

  const saveShoppingList = async () => {
    if (shoppingRoute.length === 0 && unmatchedItems.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há itens para salvar na lista de compras.",
        variant: "default",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Save matched items
      for (const route of shoppingRoute) {
        for (const item of route.itens) {
          await supabase.from('list').insert({
            item: item,
            origem: selectedStore,
            quantidade: 1
          });
        }
      }

      // Save unmatched items
      for (const item of unmatchedItems) {
        await supabase.from('list').insert({
          item: item,
          origem: selectedStore,
          quantidade: 1
        });
      }

      toast({
        title: "Sucesso",
        description: "Lista de compras salva com sucesso!",
        variant: "default",
      });

      // Clear the current list
      setItems([]);
      setShoppingRoute([]);
      setUnmatchedItems([]);
    } catch (error) {
      console.error('Error saving shopping list:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar a lista de compras.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = () => {
    fetchAisleProducts();
  };

  const showSaveButton = shoppingRoute.length > 0 || unmatchedItems.length > 0;

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
            onProcessed={handleImageProcessed}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
          
          <ManualItemEntry onAddItem={handleAddItem} />
          
          <ShoppingRouteTable 
            route={shoppingRoute} 
            rawItems={unmatchedItems} 
            onRefresh={handleRefresh}
          />
          
          <ShoppingActionButtons
            isSaving={isSaving}
            onSave={saveShoppingList}
            showSaveButton={showSaveButton}
          />
        </div>
      </div>
    </div>
  );
};

export default ShoppingListContainer;
