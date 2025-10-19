import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ExpiringEnrollmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExpiringEnrollmentsDialog = ({ open, onOpenChange }: ExpiringEnrollmentsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Matrículas a Vencer</DialogTitle>
          <DialogDescription>
            Alunos com matrículas vencendo nos próximos 10 dias
          </DialogDescription>
        </DialogHeader>
        <div className="text-center text-muted-foreground py-8">
          Funcionalidade em desenvolvimento...
        </div>
      </DialogContent>
    </Dialog>
  );
};
