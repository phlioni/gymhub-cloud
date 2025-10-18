import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { StudentsTable } from "@/components/students/StudentsTable";
import { AddStudentDialog } from "@/components/students/AddStudentDialog";
import { toast } from "sonner";

const Students = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [students, setStudents] = useState([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

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
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
    } catch (error: any) {
      toast.error("Failed to load students");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Students
              </h1>
              <p className="text-muted-foreground">
                Manage your gym members
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Add Student
            </Button>
          </div>

          <StudentsTable 
            students={students} 
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
