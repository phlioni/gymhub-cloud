import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this modality?")) return;

    try {
      const { error } = await supabase
        .from('modalities')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Modality deleted successfully");
      onRefresh();
    } catch (error: any) {
      toast.error("Failed to delete modality");
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
        <p className="text-muted-foreground">No modalities yet. Add your first class type to get started!</p>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modalities.map((modality) => (
            <TableRow key={modality.id}>
              <TableCell className="font-medium">{modality.name}</TableCell>
              <TableCell>{modality.description || "N/A"}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="ghost" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedules
                </Button>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
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
  );
};
