
export interface AisleProduct {
  corredor: number;
  produtos: string;
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
