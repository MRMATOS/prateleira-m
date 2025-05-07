
export interface AisleProduct {
  corredor: number;
  produtos: string;
  loja?: string;
}

export interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onClear: () => void;
}

export interface AisleListProps {
  aisles: AisleProduct[];
  isLoading: boolean;
  error: Error | null;
}

// Updated interface to match Supabase's produto table structure
export interface ProdutoRow {
  corredor: number;
  produto: string | null;
  loja: string;
}

export interface StoreSelectProps {
  selectedStore: string;
  setSelectedStore: (store: string) => void;
  stores: string[];
}
