import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search, CheckCircle } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CheckIn {
    id: string;
    checked_in_at: string;
    students: {
        name: string;
        phone_number: string | null;
    };
}

const Checkins = () => {
    const [loading, setLoading] = useState(true);
    const [checkins, setCheckins] = useState<CheckIn[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadCheckins();
    }, []);

    const loadCheckins = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('check_ins')
                .select(`
          id,
          checked_in_at,
          students ( name, phone_number )
        `)
                .order('checked_in_at', { ascending: false })
                .limit(100); // Limita aos 100 mais recentes

            if (error) throw error;
            setCheckins(data || []);
        } catch (error: any) {
            toast.error("Falha ao carregar os check-ins");
        } finally {
            setLoading(false);
        }
    };

    const filteredCheckins = useMemo(() => {
        if (!searchTerm) {
            return checkins;
        }
        return checkins.filter(checkin =>
            checkin.students.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [checkins, searchTerm]);

    const formatDate = (dateString: string) => {
        const date = parseISO(dateString);
        return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    };

    return (
        <main className="flex-1 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                            Histórico de Check-ins
                        </h1>
                        <p className="text-muted-foreground text-sm md:text-base">
                            Veja os últimos check-ins realizados na sua academia.
                        </p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome do aluno..."
                            className="pl-10 h-11"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
                    </div>
                ) : filteredCheckins.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filteredCheckins.map((checkin) => (
                            <Card key={checkin.id}>
                                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                    <div className="p-3 bg-primary/10 rounded-full">
                                        <CheckCircle className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{checkin.students.name}</CardTitle>
                                        <CardDescription>{formatDate(checkin.checked_in_at)}</CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="p-12 text-center">
                        <p className="text-muted-foreground">Nenhum check-in encontrado.</p>
                    </Card>
                )}
            </div>
        </main>
    );
};

export default Checkins;