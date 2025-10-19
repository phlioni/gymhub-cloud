import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EditModalityDialog } from "./EditModalityDialog";
import { ManageSchedulesDialog } from "./ManageSchedulesDialog";

interface Modality {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface ModalitiesTableProps {
  modalities: Modality[];
  loading: boolean;
  onRefresh: () => void;
}

export const ModalitiesTable = ({ modalities, loading, onRefresh }: ModalitiesTableProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showSchedulesDialog, setShowSchedulesDialog] = useState(false);
  const [selectedModality, setSelectedModality] = useState<Modality | null>(null);

  const handleEditClick = (modality: Modality) => {
    setSelectedModality(modality);
    setShowEditDialog(true);
  };

  const handleSchedulesClick = (modality: Modality) => {
    setSelectedModality(modality);
    setShowSchedulesDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta modalidade? Todos os horários associados também serão removidos.")) return;

    try {
      const { error } = await supabase.from('modalities').delete().eq('id', id);
      if (error) throw error;
      toast.success("Modalidade excluída com sucesso");
      onRefresh();
    } catch (error: any) {
      toast.error("Falha ao excluir a modalidade.");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (modalities.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Nenhuma modalidade cadastrada. Adicione sua primeira para começar!</p>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modalities.map((modality) => (
              <TableRow key={modality.id}>
                <TableCell className="font-medium">{modality.name}</TableCell>
                <TableCell>{modality.description || "N/A"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleSchedulesClick(modality)}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Agenda
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(modality)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(modality.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <EditModalityDialog
        modality={selectedModality}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          onRefresh();
          setSelectedModality(null);
        }}
      />

      <ManageSchedulesDialog
        modality={selectedModality}
        open={showSchedulesDialog}
        onOpenChange={setShowSchedulesDialog}
      />
    </>
  );
};