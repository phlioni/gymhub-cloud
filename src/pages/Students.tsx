import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { StudentsTable } from "@/components/students/StudentsTable";
import { AddStudentDialog } from "@/components/students/AddStudentDialog";
import { toast } from "sonner";

const Students = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

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
      // Busca alunos e suas matrículas associadas
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          enrollments ( id, expiry_date )
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

  // Filtra os alunos com base no termo de busca
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
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent tracking-tight">
                Alunos
              </h1>
              <p className="text-base text-muted-foreground">
                Gerencie os membros da sua academia
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  className="pl-10 h-11 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={() => setShowAddDialog(true)} size="lg" className="h-11 px-6 shadow-md hover:shadow-lg transition-all">
                <Plus className="h-5 w-5 md:mr-2" />
                <span className="hidden md:inline font-medium">Adicionar Aluno</span>
              </Button>
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
        </div>
      </main>
    </div>
  );
};

export default Students;