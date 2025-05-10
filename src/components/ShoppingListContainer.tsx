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

// Helper function to check if two aisles are physically adjacent in Block B (mirrored layout)
const areAislesAdjacent = (aisle1: number, aisle2: number): boolean => {
  // If both aisles are in Block B (25-81)
  if (aisle1 >= 25 && aisle1 <= 81 && aisle2 >= 25 && aisle2 <= 81) {
    // Calculate the mirrored/paired aisle numbers
    const mirrorAisle1 = 106 - aisle1; // 25->81, 26->80, etc.
    
    // Check if the aisles are consecutive or mirrored-adjacent
    return Math.abs(aisle1 - aisle2) === 1 || // Consecutive standard aisles
           aisle2 === mirrorAisle1 || // Direct mirror pair
           Math.abs(aisle2 - mirrorAisle1) === 1; // Adjacent to mirror pair
  }
  
  // Non-Block B aisles or aisle numbers outside range - use standard comparison
  return Math.abs(aisle1 - aisle2) === 1;
};

// Function to sort aisles based on physical proximity using mirrored layout
const sortAislesByPhysicalProximity = (aisles: number[]): number[] => {
  if (aisles.length <= 1) return aisles;

  // Clone the array to avoid mutating the input
  const sortedAisles = [...aisles];
  const result: number[] = [sortedAisles[0]]; // Start with the first aisle
  sortedAisles.splice(0, 1);

  // Build path by always picking the closest aisle to the last one
  while (sortedAisles.length > 0) {
    const lastAisle = result[result.length - 1];
    
    // Find the physically closest aisle to the current one
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    for (let i = 0; i < sortedAisles.length; i++) {
      // For Block B, we need to consider the mirrored layout
      const currentAisle = sortedAisles[i];
      
      // Calculate physical proximity
      let distance;
      if (lastAisle >= 25 && lastAisle <= 81 && currentAisle >= 25 && currentAisle <= 81) {
        // Handle Block B mirrored layout
        const lastMirror = 106 - lastAisle;
        distance = Math.min(
          Math.abs(lastAisle - currentAisle), // Direct distance
          Math.abs(lastMirror - currentAisle) // Distance via mirror pair
        );
      } else {
        // Standard distance for non-Block B aisles
        distance = Math.abs(lastAisle - currentAisle);
      }
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    
    // Add the closest aisle to our result and remove it from candidates
    result.push(sortedAisles[closestIndex]);
    sortedAisles.splice(closestIndex, 1);
  }
  
  return result;
};

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

  // Function to validate if a product exists in the database
  const validateProduct = (productName: string, products: AisleProduct[]): { isValid: boolean; aisle: number | null } => {
    if (!productName || typeof productName !== 'string' || productName.trim() === '') {
      return { isValid: false, aisle: null };
    }
    
    const normalizedProduct = normalize(productName);
    
    for (const product of products) {
      if (!product.produtos || typeof product.produtos !== 'string') continue;
      
      const productItems = product.produtos
        .split(/[,\s]+/)
        .map(p => normalize(p))
        .filter(p => p.length > 0);
      
      const hasMatch = productItems.some(prodItem => {
        if (typeof prodItem !== 'string' || typeof normalizedProduct !== 'string') return false;
        
        const exactMatch = normalizedProduct === prodItem;
        const partialMatch = (prodItem.length > 2 && normalizedProduct.includes(prodItem)) || 
                            (normalizedProduct.length > 2 && prodItem.includes(normalizedProduct));
        const similarityMatch = calculateSimilarity(normalizedProduct, prodItem) >= 0.7;
        
        return exactMatch || partialMatch || similarityMatch;
      });
      
      if (hasMatch) {
        return { isValid: true, aisle: product.corredor };
      }
    }
    
    return { isValid: false, aisle: null };
  };

  const generateRoute = (itemsList: string[], products: AisleProduct[]) => {
    const matchedItems = new Map<number, string[]>();
    const notMatched: string[] = [];

    // Process each item in the list
    itemsList.forEach(item => {
      if (typeof item !== 'string' || item.trim() === '') {
        return; // Skip invalid items
      }
      
      const validation = validateProduct(item, products);
      
      if (validation.isValid && validation.aisle !== null) {
        const corridor = validation.aisle;
        const currentItems = matchedItems.get(corridor) || [];
        if (!currentItems.includes(item)) {
          matchedItems.set(corridor, [...currentItems, item]);
        }
      } else {
        // Only add to unmatched if it's not already there
        if (!notMatched.includes(item)) {
          notMatched.push(item);
        }
      }
    });

    // Get all aisles numbers and sort them by physical proximity
    const aisleNumbers = Array.from(matchedItems.keys());
    const sortedAisles = sortAislesByPhysicalProximity(aisleNumbers);
    
    // Create the final route using the sorted aisles
    const sortedRoute = sortedAisles.map(aisle => ({
      corredor: aisle,
      itens: matchedItems.get(aisle) || []
    }));

    setShoppingRoute(sortedRoute);
    setUnmatchedItems(notMatched);
  };

  // Handle adding multiple comma-separated items
  const handleAddMultipleItems = (input: string) => {
    if (typeof input !== 'string' || input.trim() === '') {
      return;
    }
    
    // Split by commas and clean up each item
    const newItemsInput = input.split(',').map(item => item.trim()).filter(Boolean);
    
    if (newItemsInput.length === 0) {
      return;
    }
    
    const validItems: string[] = [];
    const invalidItems: string[] = [];
    
    // Validate each item
    newItemsInput.forEach(item => {
      const validation = validateProduct(item, aisleProducts);
      
      if (validation.isValid) {
        validItems.push(item);
      } else {
        invalidItems.push(item);
      }
    });
    
    // Update the items list with valid items
    if (validItems.length > 0) {
      const newItems = [...items, ...validItems];
      setItems(newItems);
      generateRoute(newItems, aisleProducts);
      
      if (validItems.length === 1) {
        toast({
          title: "Item adicionado",
          description: `${validItems[0]} foi adicionado à sua lista`,
          variant: "default"
        });
      } else {
        toast({
          title: "Itens adicionados",
          description: `${validItems.length} itens foram adicionados à sua lista`,
          variant: "default"
        });
      }
    }
    
    // Notify about invalid items
    if (invalidItems.length > 0) {
      toast({
        title: "Produtos não encontrados",
        description: `Os seguintes itens não foram encontrados: ${invalidItems.join(', ')}`,
        variant: "destructive"
      });
    }
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
              // Process and add valid items only
              const validItems: string[] = [];
              
              // Validate each extracted item
              extractedItems.forEach(item => {
                if (typeof item === 'string' && item.trim() !== '') {
                  const validation = validateProduct(item, aisleProducts);
                  if (validation.isValid) {
                    validItems.push(item);
                  }
                }
              });
              
              // If we have valid items, add them
              if (validItems.length > 0) {
                const newItems = [...items, ...validItems];
                setItems(newItems);
                generateRoute(newItems, aisleProducts);
                
                toast({
                  title: "Produtos identificados",
                  description: `${validItems.length} produtos válidos foram adicionados`,
                  variant: "default"
                });
              } else {
                toast({
                  title: "Nenhum produto encontrado",
                  description: "Nenhum produto válido foi identificado no cupom",
                  variant: "destructive"
                });
              }
            }}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
          <ManualItemEntry onAddItem={handleAddMultipleItems} />
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
              // Validate the new item first
              const validation = validateProduct(newItem, aisleProducts);
              
              if (validation.isValid) {
                // Substitui o item antigo pelo novo
                const newItems = items.map(i => i === oldItem ? newItem : i);
                setItems(newItems);
                // Regenera a rota com os novos itens
                generateRoute(newItems, aisleProducts);
                
                toast({
                  title: "Item atualizado",
                  description: `Item atualizado para "${newItem}"`,
                  variant: "default"
                });
              } else {
                toast({
                  title: "Produto não encontrado",
                  description: `"${newItem}" não foi encontrado nos produtos cadastrados`,
                  variant: "destructive"
                });
              }
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
                
                // Don't clear the list after saving - keep it displayed
                // setItems([]);
                // setShoppingRoute([]);
                // setUnmatchedItems([]);
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
