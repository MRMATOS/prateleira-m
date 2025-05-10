
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ManualItemEntryProps {
  onAddItem: (item: string) => void;
}

const ManualItemEntry: React.FC<ManualItemEntryProps> = ({ onAddItem }) => {
  const [item, setItem] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item.trim()) {
      onAddItem(item.trim());
      setItem('');
    }
  };

  return (
    <div className="border rounded-md p-4">
      <h3 className="text-lg font-medium mb-4">Adicionar item manualmente</h3>
      <p className="text-sm text-gray-500 mb-2">
        Você pode adicionar vários itens separados por vírgulas (ex: arroz, café, leite)
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="Digite o nome do produto"
          className="flex-1"
        />
        <Button type="submit" disabled={!item.trim()}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </form>
    </div>
  );
};

export default ManualItemEntry;
