
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const ShoppingListHeader = () => {
  return (
    <header className="mb-8 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <Link to="/">
          <Button variant="ghost" className="p-0 h-auto">
            <ArrowLeft className="h-5 w-5 mr-1" />
          </Button>
        </Link>
        <h1 className="text-3xl font-semibold text-gray-700">Lista de compras</h1>
      </div>
    </header>
  );
};

export default ShoppingListHeader;
