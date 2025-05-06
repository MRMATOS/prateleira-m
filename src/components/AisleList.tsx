
import React from 'react';
import { AisleListProps } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const AisleList = ({ aisles, isLoading, error }: AisleListProps) => {
  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="animate-pulse text-lg text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700">
        <p>Erro ao carregar dados: {error.message}</p>
      </div>
    );
  }

  if (aisles.length === 0) {
    return (
      <div className="mt-6 rounded-md bg-gray-50 p-6 text-center text-gray-700">
        <p className="text-lg">Nenhuma prateleira encontrada para esse produto.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-md border border-gray-200 bg-white p-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Corredor</TableHead>
            <TableHead>Produtos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {aisles.map((aisle) => (
            <TableRow key={aisle.corredor}>
              <TableCell className="font-medium">{aisle.corredor}</TableCell>
              <TableCell>{aisle.produtos}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AisleList;
