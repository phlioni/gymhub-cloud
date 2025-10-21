import { useState, useEffect, useCallback } from "react"; // Import useCallback
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
    Menu,
    LogOut,
    LayoutDashboard,
    Users,
    GraduationCap,
    Package,
    Settings,
    Dumbbell,
    CheckCheck,
    Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Session, User } from '@supabase/supabase-js'; // Importar tipos

interface AppLayoutData {
    organization: {
        name: string;
        logo_url: string | null;
    } | null;
}

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Alunos", href: "/students", icon: Users },
    { name: "Modalidades", href: "/modalities", icon: GraduationCap },
    { name: "Produtos", href: "/products", icon: Package },
    { name: "Agendamentos", href: "/scheduling", icon: Calendar },
    { name: "Check-ins", href: "/check-ins", icon: CheckCheck },
    { name: "Configurações", href: "/settings", icon: Settings },
];

export default function AppLayout() {
    const [data, setData] = useState<AppLayoutData | null>(null);
    const [loading, setLoading] = useState(true); // Mantém estado de loading inicial
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null); // Estado para o usuário
    const navigate = useNavigate();

    // Função para buscar perfil e organização, agora usando useCallback
    const checkUserProfileAndOrg = useCallback(async (userId: string) => {
        // Não define loading aqui, só se realmente for buscar dados novos
        try {
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role, organization_id")
                .eq("id", userId)
                .single();

            if (profileError || !profile) {
                throw new Error(profileError?.message || "Perfil não encontrado.");
            }

            if (profile.role === "superadmin") {
                navigate("/super-admin", { replace: true }); // Usar replace para não voltar
                return null; // Retorna null para indicar redirecionamento
            }

            if (!profile.organization_id) {
                throw new Error("Perfil incompleto ou organização não associada.");
            }

            // Busca dados da organização apenas se necessário (ou se 'data' for null)
            if (!data || data.organization === null) {
                setLoading(true); // Define loading APENAS se for buscar org
                const { data: orgData, error: orgError } = await supabase
                    .from("organizations")
                    .select("name, logo_url")
                    .eq("id", profile.organization_id)
                    .single();

                if (orgError || !orgData) {
                    throw new Error(orgError?.message || "Organização não encontrada.");
                }
                setLoading(false); // Finaliza loading após buscar org
                return { organization: orgData }; // Retorna os dados da org
            }
            return data; // Retorna os dados já existentes se não precisar buscar org


        } catch (error: any) {
            console.error("Erro ao verificar perfil/organização:", error.message);
            await supabase.auth.signOut(); // Força logout em caso de erro crítico
            toast.error("Erro ao carregar dados: " + error.message);
            navigate('/', { replace: true }); // Redireciona para login
            return null; // Retorna null em caso de erro
        }
    }, [navigate, data]); // Adiciona 'data' como dependência do useCallback


    useEffect(() => {
        let isMounted = true; // Flag para evitar updates após desmontar

        // Função async interna para lidar com a lógica inicial
        const initialize = async (session: Session | null) => {
            if (!isMounted) return; // Não faz nada se desmontado

            if (session?.user) {
                setCurrentUser(session.user);
                const fetchedData = await checkUserProfileAndOrg(session.user.id);
                if (isMounted && fetchedData !== null) { // Verifica se não houve redirecionamento ou erro
                    setData(fetchedData);
                }
                // setLoading(false) é chamado dentro de checkUserProfileAndOrg se buscar org
                // Se não buscar org (data já existe), loading inicial já foi tratado
                if (data) setLoading(false); // Garante que loading seja false se data já existia


            } else {
                setCurrentUser(null);
                setData(null);
                navigate('/', { replace: true }); // Redireciona se não houver sessão
            }
        };

        // Verifica a sessão inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            initialize(session); // Chama a função async interna
        });

        // Listener para mudanças de autenticação
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (!isMounted) return;

                if (event === 'SIGNED_OUT') {
                    setCurrentUser(null);
                    setData(null);
                    navigate('/'); // Navegação já tratada aqui
                    toast.success("Você saiu com segurança.");
                } else if (event === 'SIGNED_IN' && session?.user) {
                    // Se logou, reinicializa (busca perfil/org)
                    setLoading(true); // Mostra loading ao logar novamente
                    initialize(session);
                }
                // Para outros eventos como USER_UPDATED, TOKEN_REFRESHED, etc.,
                // podemos decidir se algo precisa ser feito. Geralmente não.
            }
        );

        // Limpa o listener e a flag isMounted ao desmontar
        return () => {
            isMounted = false;
            authListener?.subscription.unsubscribe();
        };
    }, [navigate, checkUserProfileAndOrg, data]); // Adiciona checkUserProfileAndOrg e data às dependências


    // ------ Renderização do Loading ------
    // Mostra Skeleton APENAS se loading for true E não houver currentUser (evita flash na navegação)
    if (loading && !currentUser) {
        return (
            <div className="flex h-screen bg-muted/30">
                <div className="hidden md:flex flex-col w-72 p-4 space-y-4 border-r">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <main className="flex-1 p-8"><Skeleton className="h-full w-full" /></main>
            </div>
        );
    }
    // Se não está carregando e não tem usuário (ex: após erro), renderiza null ou msg
    if (!currentUser || !data) {
        // Poderia retornar uma mensagem de erro ou redirecionamento aqui,
        // mas o onAuthStateChange e checkUserProfileAndOrg já devem ter redirecionado
        return null; // Evita renderizar layout incompleto
    }

    // ------ Renderização Principal ------
    return (
        <div className="flex min-h-screen w-full bg-muted/30">
            {/* Passa a função para fechar o menu */}
            <DesktopSidebar data={data} setMobileMenuOpen={setMobileMenuOpen} />

            <div className="flex flex-col flex-1">
                {/* Cabeçalho para Mobile */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:hidden">
                    <Sheet open={isMobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button size="icon" variant="outline">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Abrir Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <MobileSidebar data={data} onLinkClick={() => setMobileMenuOpen(false)} setMobileMenuOpen={setMobileMenuOpen} />
                        </SheetContent>
                    </Sheet>
                    <h1 className="text-lg font-semibold">{data?.organization?.name || "TreineAI"}</h1>
                </header>

                {/* Outlet para renderizar as páginas */}
                <div className="flex-1 overflow-y-auto">
                    {/* Renderiza Outlet apenas se data estiver ok */}
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

// --- Componentes Internos (DesktopSidebar, MobileSidebar, SidebarContent) ---
// (O código desses componentes permanece o mesmo da resposta anterior,
//  incluindo a modificação no handleSignOut e a passagem de setMobileMenuOpen)

// Ajustado para receber setMobileMenuOpen
const DesktopSidebar = ({ data, setMobileMenuOpen }: { data: AppLayoutData | null; setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>> }) => (
    <aside className="hidden md:flex md:flex-col md:w-72 border-r bg-sidebar">
        <SidebarContent data={data} setMobileMenuOpen={setMobileMenuOpen} />
    </aside>
);

// Ajustado para receber setMobileMenuOpen
const MobileSidebar = ({ data, onLinkClick, setMobileMenuOpen }: { data: AppLayoutData | null; onLinkClick: () => void; setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>> }) => (
    <nav className="flex h-full flex-col text-sm font-medium bg-sidebar">
        {/* Passa setMobileMenuOpen para SidebarContent */}
        <SidebarContent data={data} onLinkClick={onLinkClick} setMobileMenuOpen={setMobileMenuOpen} />
    </nav>
);

// Ajustado para receber e usar setMobileMenuOpen
const SidebarContent = ({ data, onLinkClick, setMobileMenuOpen }: { data: AppLayoutData | null; onLinkClick?: () => void; setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const navigate = useNavigate(); // useNavigate continua aqui
    const location = useLocation();

    // ---- FUNÇÃO handleSignOut MODIFICADA (Mantida da resposta anterior) ----
    const handleSignOut = async () => {
        setMobileMenuOpen(false); // Fecha o menu mobile primeiro
        const { error } = await supabase.auth.signOut(); // Espera o signOut completar
        if (error) {
            toast.error("Falha ao sair: " + error.message);
        }
        // A navegação agora é tratada pelo onAuthStateChange no AppLayout
    };
    // ---- FIM DA MODIFICAÇÃO ----

    return (
        <>
            <div className="flex flex-col flex-1">
                {/* Header da Sidebar */}
                <div className="p-6 border-b border-sidebar-border bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="flex items-center gap-3">
                        {data?.organization?.logo_url ? (
                            <img src={data.organization.logo_url} alt="Logo" className="h-12 w-12 rounded-xl object-cover shadow-md ring-2 ring-primary/10" />
                        ) : (
                            <div className="p-2.5 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-md">
                                <Dumbbell className="h-7 w-7 text-white" />
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-foreground tracking-tight">
                                {data?.organization?.name || "TreineAI"}
                            </span>
                            <span className="text-xs text-muted-foreground">Gestão Completa</span>
                        </div>
                    </div>
                </div>

                {/* Navegação da Sidebar */}
                <nav className="flex-1 px-4 py-4 space-y-1.5">
                    {navigation.map((item) => {
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={onLinkClick} // Fecha o menu mobile ao clicar no link
                                className={cn(
                                    "group flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-md shadow-primary/25"
                                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                                )}
                            >
                                <item.icon className={cn(
                                    "h-5 w-5 transition-transform duration-200",
                                    isActive ? "scale-110" : "group-hover:scale-105"
                                )} />
                                <span>{item.name}</span>
                                {isActive && (
                                    <div className="ml-auto h-2 w-2 rounded-full bg-white/90 shadow-sm animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Footer da Sidebar */}
            <div className="p-4 border-t border-sidebar-border bg-gradient-to-t from-sidebar-accent/30 to-transparent">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-xl"
                    onClick={handleSignOut} // Chama a função modificada
                >
                    <LogOut className="h-5 w-5 mr-3" />
                    <span>Sair</span>
                </Button>
            </div>
        </>
    );
};