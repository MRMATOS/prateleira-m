
import React from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShoppingActionButtonsProps {
  isSaving: boolean;
  onSave: () => void;
  showSaveButton: boolean;
}

const ShoppingActionButtons: React.FC<ShoppingActionButtonsProps> = ({
  isSaving,
  onSave,
  showSaveButton
}) => {
  if (!showSaveButton) return null;
  
  return (
    <div className="flex justify-end mt-4">
      <Button 
        onClick={onSave}
        disabled={isSaving}
        className="bg-green-500 hover:bg-green-600"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Salvando...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Salvar lista de compras
          </>
        )}
      </Button>
    </div>
  );
};

export default ShoppingActionButtons;
