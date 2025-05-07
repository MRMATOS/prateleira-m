
import React from 'react';
import { StoreSelectProps } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store } from 'lucide-react';

const StoreSelect: React.FC<StoreSelectProps> = ({ selectedStore, setSelectedStore, stores }) => {
  return (
    <div className="flex items-center gap-2">
      <Store className="h-5 w-5 text-gray-500" />
      <Select value={selectedStore} onValueChange={setSelectedStore}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Selecione uma loja" />
        </SelectTrigger>
        <SelectContent>
          {stores.map((store) => (
            <SelectItem key={store} value={store}>
              {store}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StoreSelect;
