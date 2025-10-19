import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; // Import Button
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { differenceInDays, startOfDay } from 'date-fns';
import { User } from "lucide-react"; // Import User icon

interface ExpiringEnrollmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Enrollment {
  expiry_date: string;
  students: { name: string; phone_number: string | null } | null;
  modalities: { name: string } | null;
}

export const ExpiringEnrollmentsDialog = ({ open, onOpenChange }: ExpiringEnrollmentsDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate(); // Initialize navigate

  useEffect(() => {
    if (open) {
      loadExpiringEnrollments();
    }
  }, [open]);

  const loadExpiringEnrollments = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const tenDaysFromNow = new Date();
      tenDaysFromNow.setDate(today.getDate() + 10);

      const { data, error } = await supabase
        .from('enrollments')
        .select(`expiry_date, students ( name, phone_number ), modalities ( name )`)
        .lte('expiry_date', tenDaysFromNow.toISOString().split('T')[0])
        .gte('expiry_date', today.toISOString().split('T')[0])
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      setEnrollments(data || []);
    } catch (error: any) {
      toast.error("Falha ao carregar matrículas a vencer.");
    } finally {
      setLoading(false);
    }
  };

  const filteredEnrollments = useMemo(() => {
    if (!searchTerm) return enrollments;
    return enrollments.filter(e => e.students?.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, enrollments]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return adjustedDate.toLocaleDateString('pt-BR');
  };

  const getDaysRemaining = (dateString: string) => {
    const today = startOfDay(new Date());
    const expiry = startOfDay(new Date(dateString));
    return differenceInDays(expiry, today);
  }

  const handleGoToStudent = (studentName: string | undefined) => {
    if (studentName) {
      navigate(`/students?name=${encodeURIComponent(studentName)}`);
      onOpenChange(false); // Close the dialog
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Matrículas a Vencer nos Próximos 10 Dias</DialogTitle>
          <DialogDescription>Alunos com matrículas vencendo nos próximos 10 dias.</DialogDescription>
        </DialogHeader>
        <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="my-4" />
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (<Skeleton className="w-full h-32" />) :
            filteredEnrollments.length > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Telefone</TableHead><TableHead>Modalidade</TableHead><TableHead>Vence em</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredEnrollments.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{e.students?.name}</TableCell>
                      <TableCell>{e.students?.phone_number || 'N/A'}</TableCell>
                      <TableCell>{e.modalities?.name}</TableCell>
                      <TableCell className="font-semibold text-accent">{`${getDaysRemaining(e.expiry_date)} dia(s)`}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleGoToStudent(e.students?.name)}>
                          <User className="h-4 w-4 mr-2" />
                          Ir para Aluno
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (<p className="text-center text-sm text-muted-foreground py-8">Nenhuma matrícula vencendo nos próximos 10 dias.</p>)}
        </div>
      </DialogContent>
    </Dialog>
  );
};