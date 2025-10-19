import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface ExpiringEnrollmentsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface ExpiringStudent {
    expiry_date: string;
    students: {
        name: string;
        cpf: string | null;
        birth_date: string | null;
    } | null;
    modalities: {
        name: string;
    } | null;
}

export const ExpiringEnrollmentsDialog = ({ open, onOpenChange }: ExpiringEnrollmentsDialogProps) => {
    const [loading, setLoading] = useState(true);
    const [enrollments, setEnrollments] = useState<ExpiringStudent[]>([]);
    const [filteredEnrollments, setFilteredEnrollments] = useState<ExpiringStudent[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (open) {
            loadExpiringEnrollments();
        } else {
            setEnrollments([]);
            setFilteredEnrollments([]);
            setSearchTerm("");
        }
    }, [open]);

    useEffect(() => {
        const filtered = enrollments.filter(enrollment =>
            enrollment.students?.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredEnrollments(filtered);
    }, [searchTerm, enrollments]);

    const loadExpiringEnrollments = async () => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const tenDaysFromNow = new Date();
            tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);

            const { data, error } = await supabase
                .from('enrollments')
                .select(`
          expiry_date,
          students ( name, cpf, birth_date ),
          modalities ( name )
        `)
                .lte('expiry_date', tenDaysFromNow.toISOString().split('T')[0])
                .gte('expiry_date', today)
                .order('expiry_date', { ascending: true });

            if (error) throw error;

            setEnrollments(data || []);
            setFilteredEnrollments(data || []);
        } catch (error: any) {
            toast.error("Falha ao carregar matrículas vencendo.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        date.setDate(date.getDate() + 1); // Correção de fuso
        return date.toLocaleDateString('pt-BR');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Matrículas Vencendo nos Próximos 10 Dias</DialogTitle>
                    <DialogDescription>
                        Lista de alunos com matrículas próximas do vencimento.
                    </DialogDescription>
                </DialogHeader>
                <div className="my-4">
                    <Input
                        placeholder="Filtrar por nome do aluno..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : filteredEnrollments.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Aluno</TableHead>
                                    <TableHead>CPF</TableHead>
                                    <TableHead>Data de Nascimento</TableHead>
                                    <TableHead>Modalidade</TableHead>
                                    <TableHead className="text-right">Vencimento</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEnrollments.map((enrollment, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{enrollment.students?.name || 'N/A'}</TableCell>
                                        <TableCell>{enrollment.students?.cpf || 'N/A'}</TableCell>
                                        <TableCell>{formatDate(enrollment.students?.birth_date)}</TableCell>
                                        <TableCell>{enrollment.modalities?.name || 'N/A'}</TableCell>
                                        <TableCell className="text-right font-medium text-destructive">
                                            {formatDate(enrollment.expiry_date)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Nenhuma matrícula encontrada para o filtro atual.
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};