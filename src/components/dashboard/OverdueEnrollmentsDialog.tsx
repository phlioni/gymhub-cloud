import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { differenceInDays, startOfDay } from 'date-fns';
import { MessageCircle } from "lucide-react";

interface OverdueEnrollmentsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface Enrollment {
    expiry_date: string;
    students: { name: string; phone_number: string | null } | null;
    modalities: { name: string } | null;
}

export const OverdueEnrollmentsDialog = ({ open, onOpenChange }: OverdueEnrollmentsDialogProps) => {
    const [loading, setLoading] = useState(true);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (open) {
            loadOverdueEnrollments();
        }
    }, [open]);

    const loadOverdueEnrollments = async () => {
        setLoading(true);
        try {
            const today = new Date();
            const { data, error } = await supabase
                .from('enrollments')
                .select(`expiry_date, students ( name, phone_number ), modalities ( name )`)
                .lt('expiry_date', today.toISOString().split('T')[0])
                .order('expiry_date', { ascending: true });

            if (error) throw error;
            setEnrollments(data || []);
        } catch (error: any) {
            toast.error("Falha ao carregar matrículas vencidas.");
        } finally {
            setLoading(false);
        }
    };

    const filteredEnrollments = useMemo(() => {
        if (!searchTerm) return enrollments;
        return enrollments.filter(e => e.students?.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [searchTerm, enrollments]);

    const getDaysOverdue = (dateString: string) => {
        const today = startOfDay(new Date());
        const expiry = startOfDay(new Date(dateString));
        return Math.abs(differenceInDays(expiry, today));
    }

    const handleContact = (phone: string | null) => {
        if (phone) {
            window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
        } else {
            toast.warning("Este aluno não possui um número de telefone cadastrado.");
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Alunos com Pagamentos Atrasados</DialogTitle>
                    <DialogDescription>Lista de alunos com matrículas vencidas que precisam de atenção.</DialogDescription>
                </DialogHeader>
                <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="my-4" />
                <div className="max-h-[60vh] overflow-y-auto">
                    {loading ? (<Skeleton className="w-full h-32" />) :
                        filteredEnrollments.length > 0 ? (
                            <Table>
                                <TableHeader><TableRow><TableHead>Aluno</TableHead><TableHead>Modalidade</TableHead><TableHead>Atrasado há</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {filteredEnrollments.map((e, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{e.students?.name}</TableCell>
                                            <TableCell>{e.modalities?.name}</TableCell>
                                            <TableCell className="font-semibold text-destructive">{`${getDaysOverdue(e.expiry_date)} dia(s)`}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" onClick={() => handleContact(e.students?.phone_number || null)}>
                                                    <MessageCircle className="h-4 w-4 mr-2" />
                                                    Cobrar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (<p className="text-center text-sm text-muted-foreground py-8">Nenhum aluno com pagamentos atrasados. Ótimo trabalho!</p>)}
                </div>
            </DialogContent>
        </Dialog>
    );
};