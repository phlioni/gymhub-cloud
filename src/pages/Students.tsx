import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MessageCircle, Upload } from "lucide-react";
import { StudentsTable } from "@/components/students/StudentsTable";
import { AddStudentDialog } from "@/components/students/AddStudentDialog";
import { toast } from "sonner";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { WhatsappInfoDialog } from "@/components/students/WhatsappInfoDialog";
import { ImportStudentsDialog } from "@/components/students/ImportStudentsDialog";

const Students = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showWhatsappInfo, setShowWhatsappInfo] = useState(false);

  useEffect(() => {
    const nameParam = searchParams.get('name');
    if (nameParam) {
      setSearchTerm(nameParam);
    }
    checkAuth();
  }, [searchParams]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role === 'superadmin') {
      navigate('/super-admin');
      return;
    }

    setOrganizationId(profile?.organization_id || null);
    loadStudents();
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          enrollments ( id, expiry_date, price, modalities ( name ) )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast.error("Falha ao carregar os alunos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm) {
      return students;
    }
    return students.filter(student =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary/[0.02] via-background to-accent/[0.02]">
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent tracking-tight">
                Alunos
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Gerencie os membros da sua academia
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-end items-center gap-3">
              <div className="relative w-full sm:w-auto md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  className="pl-10 h-11 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex w-full sm:w-auto items-center gap-3">
                <Button variant="outline" className="h-11 px-4 w-full sm:w-auto" onClick={() => setShowWhatsappInfo(true)}>
                  <MessageCircle className="h-5 w-5 md:mr-2" />
                  <span className="hidden md:inline font-medium">Link do Aluno</span>
                </Button>
                <Button variant="outline" className="h-11 px-4 w-full sm:w-auto" onClick={() => setShowImportDialog(true)}>
                  <Upload className="h-5 w-5 md:mr-2" />
                  <span className="hidden md:inline font-medium">Importar</span>
                </Button>
                <Button onClick={() => setShowAddDialog(true)} size="lg" className="h-11 px-6 shadow-md hover:shadow-lg transition-all hidden md:inline-flex">
                  <Plus className="h-5 w-5 md:mr-2" />
                  <span className="hidden md:inline font-medium">Adicionar Aluno</span>
                </Button>
              </div>
            </div>
          </div>

          <StudentsTable
            students={filteredStudents}
            loading={loading}
            onRefresh={loadStudents}
          />

          <AddStudentDialog
            open={showAddDialog}
            onOpenChange={setShowAddDialog}
            organizationId={organizationId}
            onSuccess={loadStudents}
          />

          <WhatsappInfoDialog
            open={showWhatsappInfo}
            onOpenChange={setShowWhatsappInfo}
          />

          <ImportStudentsDialog
            open={showImportDialog}
            onOpenChange={setShowImportDialog}
            organizationId={organizationId}
            onSuccess={loadStudents}
          />

        </div>
        <FloatingActionButton onClick={() => setShowAddDialog(true)} />
      </main>
    </div>
  );
};

export default Students;