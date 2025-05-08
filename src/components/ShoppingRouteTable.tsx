
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface RouteItem {
  corredor: number;
  itens: string[];
}

interface ShoppingRouteTableProps {
  route: RouteItem[];
  rawItems: string[];
}

const ShoppingRouteTable: React.FC<ShoppingRouteTableProps> = ({ route, rawItems }) => {
  if (!route || route.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-6">
      <Tabs defaultValue="route">
        <TabsList className="mb-4">
          <TabsTrigger value="route">Rota de compras</TabsTrigger>
          <TabsTrigger value="items">Itens não classificados</TabsTrigger>
        </TabsList>
        
        <TabsContent value="route">
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Corredor</TableHead>
                  <TableHead>Produtos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {route.map((item) => (
                  <TableRow key={item.corredor}>
                    <TableCell className="font-medium">{item.corredor}</TableCell>
                    <TableCell>{item.itens.join(', ')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="items">
          <div className="border rounded-md p-4">
            <h3 className="font-medium mb-2">Itens não encontrados nos corredores:</h3>
            <div className="flex flex-wrap gap-2">
              {rawItems.length > 0 ? (
                rawItems.map((item, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 rounded-md text-sm">
                    {item}
                  </span>
                ))
              ) : (
                <p className="text-gray-500">Todos os itens foram classificados!</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShoppingRouteTable;
