'use client';

import { useState } from 'react';
import ImageUpload from '@/components/ImageUpload';
import ShoppingListContainer from '@/components/ShoppingListContainer';

export default function Home() {
  const [shoppingList, setShoppingList] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <main className="container mx-auto p-4">
      {/* Componente de Upload */}
      <ImageUpload onProcessed={setShoppingList} />

      {/* Campo de Busca (Adicione isso) */}
      <input
        type="text"
        placeholder="Buscar produtos..."
        className="w-full p-2 border rounded-md mt-4"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Lista de Produtos */}
      <ShoppingListContainer 
        items={shoppingList} 
        searchTerm={searchTerm} 
      />
    </main>
  );
}
