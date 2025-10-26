import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ModalitiesTable } from "@/components/modalities/ModalitiesTable";
import { AddModalityDialog } from "@/components/modalities/AddModalityDialog";
import { toast } from "sonner";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { useAuthProtection } from "@/hooks/useAuthProtection";

const Modalities = () => {
  const { organizationId, loading: authLoading } = useAuthProtection();
  const [modalitiesLoading, setModalitiesLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [modalities, setModalities] = useState<any[]>([]);

  useEffect(() => {
    if (organizationId) {
      loadModalities();
    }
  }, [organizationId]);

  const loadModalities = async () => {
    setModalitiesLoading(true);
    try {
      const { data, error } = await supabase
        .from('modalities')
        .select('*')
        .order('name');

      if (error) throw error;
      setModalities(data || []);
    } catch (error: any) {
      toast.error("Falha ao carregar as modalidades");
      console.error(error);
    } finally {
      setModalitiesLoading(false);
    }
  };

  const isLoading = authLoading || modalitiesLoading;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary/[0.02] via-background to-accent/[0.02]">
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent tracking-tight">
                Modalidades
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Gerencie os tipos de aulas e horários
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="lg" className="h-11 px-6 shadow-md hover:shadow-lg transition-all hidden md:inline-flex">
              <Plus className="h-5 w-5 mr-2" />
              <span className="font-medium">Adicionar Modalidade</span>
            </Button>
          </div>

          <ModalitiesTable
            modalities={modalities}
            loading={isLoading}
            onRefresh={loadModalities}
          />

          <AddModalityDialog
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            organizationId={organizationId}
            onSuccess={loadModalities}
          />
        </div>
        <FloatingActionButton onClick={() => setShowAddDialog(true)} />
      </main>
    </div>
  );
};

export default Modalities;