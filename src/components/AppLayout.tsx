import { useState, useEffect, useCallback } from "react";
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
import { Session, User, AuthSubscription } from '@supabase/supabase-js'; // Importar AuthSubscription

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
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const navigate = useNavigate();

    const checkUserProfileAndOrg = useCallback(async (userId: string) => {
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
                navigate("/super-admin", { replace: true });
                return null;
            }

            if (!profile.organization_id) {
                throw new Error("Perfil incompleto ou organização não associada.");
            }

            // Busca dados da organização apenas se necessário (ou se 'data' for null)
            // Evita refetch desnecessário em navegação normal
            if (!data || !data.organization || data.organization === null) {
                // setLoading(true); // Só ativa loading se for buscar ORG
                const { data: orgData, error: orgError } = await supabase
                    .from("organizations")
                    .select("name, logo_url")
                    .eq("id", profile.organization_id)
                    .single();

                if (orgError || !orgData) {
                    throw new Error(orgError?.message || "Organização não encontrada.");
                }
                // setLoading(false); // Desativa loading após buscar ORG
                return { organization: orgData };
            }
            return data; // Retorna os dados existentes

        } catch (error: any) {
            console.error("Erro ao verificar perfil/organização:", error.message);
            await supabase.auth.signOut();
            toast.error("Erro ao carregar dados: " + error.message);
            navigate('/', { replace: true });
            return null;
        }
    }, [navigate, data]);


    useEffect(() => {
        let isMounted = true;
        let authSubscription: AuthSubscription | null = null; // Variável para guardar a subscrição

        const initialize = async (session: Session | null) => {
            if (!isMounted) return;
            setLoading(true); // Inicia loading na inicialização/login

            if (session?.user) {
                setCurrentUser(session.user);
                const fetchedData = await checkUserProfileAndOrg(session.user.id);
                if (isMounted && fetchedData !== null) {
                    setData(fetchedData);
                }
            } else {
                setCurrentUser(null);
                setData(null);
                navigate('/', { replace: true });
            }
            if (isMounted) setLoading(false); // Finaliza loading após tentativa
        };

        // Verifica a sessão inicial e inicializa
        supabase.auth.getSession().then(({ data: { session } }) => {
            initialize(session);

            // ----- MOVIDO PARA DENTRO do .then() -----
            // Configura o listener APÓS verificar a sessão inicial
            const { data: listener } = supabase.auth.onAuthStateChange(
                (event, session) => {
                    if (!isMounted) return;

                    if (event === 'SIGNED_OUT') {
                        setCurrentUser(null);
                        setData(null);
                        // A navegação para '/' acontece implicitamente ao desmontar/remontar
                        // devido à falta de sessão na próxima verificação inicial.
                        // Apenas mostramos o toast aqui.
                        toast.success("Você saiu com segurança.");
                        // Forçar um estado de loading falso pode ajudar a evitar o skeleton flash
                        setLoading(false);
                        navigate('/'); // Adicionado para garantir o redirecionamento imediato

                    } else if (event === 'SIGNED_IN' && session?.user) {
                        // Reinicializa ao logar
                        initialize(session);
                    }
                }
            );
            authSubscription = listener.subscription; // Guarda a subscrição
            // ----- FIM DO BLOCO MOVIDO -----
        });


        // Função de limpeza
        return () => {
            isMounted = false;
            // ----- CORREÇÃO APLICADA AQUI -----
            // Verifica se a subscrição existe antes de cancelar
            if (authSubscription && typeof authSubscription.unsubscribe === 'function') {
                authSubscription.unsubscribe();
            }
            // ----- FIM DA CORREÇÃO -----
        };
    }, [navigate, checkUserProfileAndOrg]); // Removido 'data' da dependência para evitar re-execução excessiva


    // ------ Renderização do Loading ------
    // Mostra Skeleton APENAS se loading for true E não houver currentUser (no início)
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
    // Se não está carregando E não tem usuário/data (após erro/logout), retorna null para o Router lidar
    if (!loading && (!currentUser || !data)) {
        return null;
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
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

// --- Componentes Internos (DesktopSidebar, MobileSidebar, SidebarContent) ---
// (O código desses componentes permanece o mesmo das respostas anteriores)

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
    // useNavigate não é mais necessário aqui se a navegação é tratada no AppLayout
    const location = useLocation();

    // ---- FUNÇÃO handleSignOut MODIFICADA ----
    const handleSignOut = async () => {
        setMobileMenuOpen(false); // Fecha o menu mobile primeiro
        const { error } = await supabase.auth.signOut(); // Espera o signOut completar
        if (error) {
            toast.error("Falha ao sair: " + error.message);
        }
        // A navegação será tratada pelo onAuthStateChange no AppLayout
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