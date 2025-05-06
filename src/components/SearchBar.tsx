
import React, { ChangeEvent } from 'react';
import { Search, X } from 'lucide-react';
import { SearchBarProps } from '@/types';

const SearchBar = ({ searchQuery, setSearchQuery, onClear }: SearchBarProps) => {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="relative flex w-full items-center gap-2">
      <div className="relative flex-grow">
        <input
          type="text"
          value={searchQuery}
          onChange={handleChange}
          placeholder="Palavra chave"
          className="w-full rounded-md border border-gray-200 bg-white px-4 py-4 text-lg outline-none transition-all focus:border-search"
          aria-label="Buscar produto"
        />
        {searchQuery && (
          <button
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Limpar busca"
          >
            <X size={20} />
          </button>
        )}
      </div>
      <button
        className="flex h-[58px] w-[58px] items-center justify-center rounded-md bg-search text-white transition-colors hover:bg-search-hover"
        aria-label="Buscar"
      >
        <Search size={28} />
      </button>
    </div>
  );
};

export default SearchBar;
