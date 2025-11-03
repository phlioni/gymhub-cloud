import { Plus } from "lucide-react";
import { Button } from "./button";

interface FloatingActionButtonProps {
    onClick: () => void;
    disabled?: boolean; // <<< 1. ADICIONADO
}

export const FloatingActionButton = ({ onClick, disabled }: FloatingActionButtonProps) => { // <<< 2. ADICIONADO
    return (
        <Button
            onClick={onClick}
            className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 md:hidden"
            disabled={disabled} // <<< 3. ADICIONADO
        >
            <Plus className="h-6 w-6" />
        </Button>
    );
};