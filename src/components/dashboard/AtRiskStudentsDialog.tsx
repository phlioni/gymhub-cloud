import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageCircle, User } from "lucide-react";

interface AtRiskStudentsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface AtRiskStudent {
    id: string;
    name: string;
    phone_number: string | null;
    last_check_in: string | null;
}

export const AtRiskStudentsDialog = ({ open, onOpenChange }: AtRiskStudentsDialogProps) => {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState<AtRiskStudent[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        if (open) {
            loadAtRiskStudents();
        }
    }, [open]);

    const loadAtRiskStudents = async () => {
        setLoading(true);
        try {
            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

            const { data: allStudents, error: studentsError } = await supabase
                .from('students')
                .select('id, name, phone_number, check_ins(checked_in_at)');

            if (studentsError) throw studentsError;

            const atRisk = allStudents.filter(student => {
                if (student.check_ins.length === 0) return true;
                const lastCheckIn = new Date(Math.max(...student.check_ins.map(ci => new Date(ci.checked_in_at).getTime())));
                return lastCheckIn < fifteenDaysAgo;
            }).map(s => ({
                id: s.id,
                name: s.name,
                phone_number: s.phone_number,
                last_check_in: s.check_ins.length > 0 ? new Date(Math.max(...s.check_ins.map(ci => new Date(ci.checked_in_at).getTime()))).toISOString() : null
            }));

            setStudents(atRisk);

        } catch (error: any) {
            toast.error("Falha ao carregar alunos em risco.");
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students;
        return students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, students]);

    const handleContact = (phone: string | null) => {
        if (phone) {
            const message = encodeURIComponent("Olá! Sentimos sua falta na academia. Está tudo bem? Gostaríamos de saber como podemos te ajudar a voltar aos treinos. 💪");
            window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
        } else {
            toast.warning("Este aluno não possui um número de telefone cadastrado.");
        }
    }

    const handleGoToStudent = (studentName: string) => {
        navigate(`/students?name=${encodeURIComponent(studentName)}`);
        onOpenChange(false);
    };

    const formatLastCheckin = (dateString: string | null) => {
        if (!dateString) return "Nunca";
        return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Alunos em Risco de Evasão</DialogTitle>
                    <DialogDescription>Lista de alunos que não fazem check-in há mais de 15 dias.</DialogDescription>
                </DialogHeader>
                <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="my-4" />
                <div className="max-h-[60vh] overflow-y-auto">
                    {loading ? (<Skeleton className="w-full h-32" />) :
                        filteredStudents.length > 0 ? (
                            <Table>
                                <TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Último Check-in</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredStudents.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">{s.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{formatLastCheckin(s.last_check_in)}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button size="sm" variant="outline" onClick={() => handleGoToStudent(s.name)}>
                                                    <User className="h-4 w-4 mr-2" />
                                                    Ver Aluno
                                                </Button>
                                                <Button size="sm" onClick={() => handleContact(s.phone_number)}>
                                                    <MessageCircle className="h-4 w-4 mr-2" />
                                                    Contatar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (<p className="text-center text-sm text-muted-foreground py-8">Nenhum aluno em risco no momento. Todos engajados!</p>)}
                </div>
            </DialogContent>
        </Dialog>
    );
};