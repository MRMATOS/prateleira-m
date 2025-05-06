
import React from 'react';
import { AisleListProps } from '@/types';

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
      <ul className="divide-y divide-gray-100">
        {aisles.map((aisle) => (
          <li key={aisle.corredor} className="py-4 px-2 text-gray-700">
            <p className="text-lg">
              <span className="font-medium">{aisle.corredor}: </span>
              {aisle.produtos}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AisleList;
