import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, CalendarClock, Bell, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EditStudentDialog } from "./EditStudentDialog";
import { RenewEnrollmentDialog } from "./RenewEnrollmentDialog";
import { getEnrollmentStatus } from "@/utils/enrollmentStatus";

interface Student {
  id: string;
  name: string;
  cpf: string | null;
  birth_date: string | null;
  phone_number: string | null;
  created_at: string;
  enrollments: {
    id: string;
    expiry_date: string;
    price: number | null;
    modalities: { name: string } | null;
  }[];
}

interface StudentsTableProps {
  students: Student[];
  loading: boolean;
  onRefresh: () => void;
}

export const StudentsTable = ({ students, loading, onRefresh }: StudentsTableProps) => {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [enrollmentToRenew, setEnrollmentToRenew] = useState<{ student: Student; enrollment: Student['enrollments'][0] } | null>(null);

  const handleEditClick = (student: Student) => {
    setSelectedStudent(student);
    setShowEditDialog(true);
  };

  const handleRenewClick = (student: Student) => {
    if (student.enrollments.length === 0) {
      toast.error("Este aluno não possui uma matrícula para renovar.");
      return;
    }
    const latestEnrollment = student.enrollments.sort((a, b) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime())[0];
    setEnrollmentToRenew({ student, enrollment: latestEnrollment });
    setShowRenewDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.")) return;
    try {
      await supabase.from('enrollments').delete().eq('student_id', id);
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      toast.success("Aluno excluído com sucesso");
      onRefresh();
    } catch (error: any) {
      toast.error("Falha ao excluir aluno.");
      console.error(error);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (<div key={i} className="h-12 bg-muted animate-pulse rounded" />))}
        </div>
      </Card>
    );
  }

  if (students.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Nenhum aluno encontrado.</p>
      </Card>
    );
  }

  return (
    <>
      <TooltipProvider>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Modalidades e Preços</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Automação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const latestEnrollment = student.enrollments.length > 0
                  ? student.enrollments.sort((a, b) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime())[0]
                  : null;

                const status = getEnrollmentStatus(latestEnrollment?.expiry_date || null);
                const isAutomationActive = status.daysRemaining !== null && status.daysRemaining <= 10 && status.daysRemaining >= 1;

                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      <div>{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.phone_number || "Sem telefone"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {student.enrollments.length > 0 ? (
                          student.enrollments.map(e => (
                            <Badge key={e.id} variant="secondary" className="font-normal whitespace-nowrap">
                              {e.modalities?.name || 'N/A'} (R$ {Number(e.price || 0).toFixed(2).replace('.', ',')})
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.text}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-block">
                            {isAutomationActive ? <Bell className="h-5 w-5 text-yellow-500" /> : <BellOff className="h-5 w-5 text-muted-foreground/50" />}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{isAutomationActive ? "Lembretes de vencimento por WhatsApp estão ativos." : "Automação de lembretes inativa."}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" onClick={() => handleRenewClick(student)}>
                        <CalendarClock className="h-4 w-4 mr-2" />
                        Renovar
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(student)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </TooltipProvider>

      <EditStudentDialog student={selectedStudent} open={showEditDialog} onOpenChange={setShowEditDialog} onSuccess={onRefresh} />
      <RenewEnrollmentDialog student={enrollmentToRenew?.student || null} enrollment={enrollmentToRenew?.enrollment || null} open={showRenewDialog} onOpenChange={setShowRenewDialog} onSuccess={onRefresh} />
    </>
  );
};