
import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const ShoppingListButton = () => {
  return (
    <Link to="/shopping-list">
      <Button variant="default" className="bg-green-500 hover:bg-green-600 flex items-center gap-2">
        <ShoppingCart className="h-5 w-5" />
        <span className="hidden sm:inline">Lista de compras</span>
      </Button>
    </Link>
  );
};

export default ShoppingListButton;
