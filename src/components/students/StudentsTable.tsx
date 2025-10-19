import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, CalendarClock, Bell, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EditStudentDialog } from "./EditStudentDialog";
import { RenewEnrollmentDialog } from "./RenewEnrollmentDialog";
import { getEnrollmentStatus } from "@/utils/enrollmentStatus";

// Tipagem atualizada para incluir matrículas
interface Student {
  id: string;
  name: string;
  cpf: string | null;
  birth_date: string | null;
  created_at: string;
  enrollments: {
    id: string;
    expiry_date: string;
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
      toast.error("Este aluno não possui uma matrícula ativa para renovar.");
      return;
    }
    // Pega a matrícula mais recente (assumindo que é a que deve ser renovada)
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

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    const d = new Date(date);
    const adjustedDate = new Date(d.valueOf() + d.getTimezoneOffset() * 60 * 1000);
    return adjustedDate.toLocaleDateString('pt-BR');
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

  if (students.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">Nenhum aluno encontrado.</p>
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
              <TableHead>CPF</TableHead>
              <TableHead>Status da Matrícula</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Notificação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const hasEnrollment = student.enrollments.length > 0;
              const latestEnrollment = hasEnrollment 
                ? student.enrollments.sort((a, b) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime())[0]
                : null;
              
              const status = latestEnrollment ? getEnrollmentStatus(latestEnrollment.expiry_date) : null;
              const expiryDateFormatted = latestEnrollment ? formatDate(latestEnrollment.expiry_date) : "Sem Matrícula";

              return (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.cpf || "N/A"}</TableCell>
                  <TableCell>
                    {status ? (
                      <Badge variant={status.variant}>
                        {status.label}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Sem Matrícula</Badge>
                    )}
                  </TableCell>
                  <TableCell>{expiryDateFormatted}</TableCell>
                  <TableCell>
                    {status?.shouldNotify ? (
                      <div className="flex items-center gap-2">
                        {status.notificationSent ? (
                          <Badge variant="outline" className="gap-1">
                            <BellOff className="h-3 w-3" />
                            Enviada
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <Bell className="h-3 w-3" />
                            Pendente
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
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

      <EditStudentDialog
        student={selectedStudent}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          onRefresh();
          setSelectedStudent(null);
        }}
      />

      <RenewEnrollmentDialog
        student={enrollmentToRenew?.student || null}
        enrollment={enrollmentToRenew?.enrollment || null}
        open={showRenewDialog}
        onOpenChange={setShowRenewDialog}
        onSuccess={() => {
          onRefresh();
          setEnrollmentToRenew(null);
        }}
      />
    </>
  );
};