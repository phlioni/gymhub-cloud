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
    Calendar,
    Weight,
    Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Session, User, AuthSubscription } from '@supabase/supabase-js';

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
    { name: "Treinos", href: "/workouts", icon: Weight },
    { name: "Check-ins", href: "/check-ins", icon: CheckCheck },
    { name: "Assistente IA", href: "/ai-assistant", icon: Bot },
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
                // @ts-ignore
                .select("role, organization_id, is_active, organizations(subscription_status)")
                .eq("id", userId)
                .single();

            if (profileError || !profile) {
                throw new Error(profileError?.message || "Perfil não encontrado.");
            }

            // @ts-ignore
            const subStatus = profile.organizations?.subscription_status;
            if (!profile.is_active || subStatus === 'inactive' || subStatus === 'overdue') {
                await supabase.auth.signOut();
                toast.error("Sua conta foi desativada ou sua assinatura expirou.");
                navigate(`/login?status=${subStatus || 'inactive'}`, { replace: true });
                return null;
            }

            if (profile.role === "superadmin") {
                navigate("/super-admin", { replace: true });
                return null;
            }

            if (!profile.organization_id) {
                throw new Error("Perfil incompleto ou organização não associada.");
            }

            if (!data || !data.organization || data.organization === null) {
                const { data: orgData, error: orgError } = await supabase
                    .from("organizations")
                    .select("name, logo_url")
                    .eq("id", profile.organization_id)
                    .single();

                if (orgError || !orgData) {
                    throw new Error(orgError?.message || "Organização não encontrada.");
                }
                return { organization: orgData };
            }
            return data;

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
        let authSubscription: AuthSubscription | null = null;

        const initialize = async (session: Session | null) => {
            if (!isMounted) return;
            setLoading(true);

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
            if (isMounted) setLoading(false);
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            initialize(session);

            const { data: listener } = supabase.auth.onAuthStateChange(
                (event, session) => {
                    if (!isMounted) return;

                    if (event === 'SIGNED_OUT') {
                        setCurrentUser(null);
                        setData(null);
                        toast.success("Você saiu com segurança.");
                        setLoading(false);
                        navigate('/');

                    } else if (event === 'SIGNED_IN' && session?.user) {
                        initialize(session);
                    }
                }
            );
            authSubscription = listener.subscription;
        });

        const profileSubscription = supabase.channel('public:profiles')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser?.id}` }, (payload) => {
                if (payload.new.is_active === false) {
                    toast.warning("Sua conta foi desativada. Você será desconectado.");
                    setTimeout(() => {
                        supabase.auth.signOut();
                        navigate('/', { replace: true });
                    }, 2000);
                }
            })
            .subscribe();

        const orgSubscription = supabase.channel('public:organizations')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'organizations' }, (payload) => {
                // @ts-ignore
                if (payload.new.id === data?.organization?.id && (payload.new.subscription_status === 'inactive' || payload.new.subscription_status === 'overdue')) {
                    toast.warning("A assinatura da sua organização expirou. Você será desconectado.");
                    setTimeout(() => {
                        supabase.auth.signOut();
                        navigate(`/login?status=${payload.new.subscription_status}`, { replace: true });
                    }, 2000);
                }
            })
            .subscribe();

        return () => {
            isMounted = false;
            if (authSubscription && typeof authSubscription.unsubscribe === 'function') {
                authSubscription.unsubscribe();
            }
            supabase.removeChannel(profileSubscription);
            supabase.removeChannel(orgSubscription);
        };
    }, [navigate, checkUserProfileAndOrg, currentUser?.id, data]);


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
    if (!loading && (!currentUser || !data)) {
        return null;
    }

    return (
        <div className="flex min-h-screen w-full bg-muted/30">
            <DesktopSidebar data={data} setMobileMenuOpen={setMobileMenuOpen} />

            <div className="flex flex-col flex-1">
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

                <div className="flex-1 overflow-y-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

const DesktopSidebar = ({ data, setMobileMenuOpen }: { data: AppLayoutData | null; setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>> }) => (
    <aside className="hidden md:flex md:flex-col md:w-72 border-r bg-sidebar">
        <SidebarContent data={data} setMobileMenuOpen={setMobileMenuOpen} />
    </aside>
);

const MobileSidebar = ({ data, onLinkClick, setMobileMenuOpen }: { data: AppLayoutData | null; onLinkClick: () => void; setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>> }) => (
    <nav className="flex h-full flex-col text-sm font-medium bg-sidebar">
        <SidebarContent data={data} onLinkClick={onLinkClick} setMobileMenuOpen={setMobileMenuOpen} />
    </nav>
);

const SidebarContent = ({ data, onLinkClick, setMobileMenuOpen }: { data: AppLayoutData | null; onLinkClick?: () => void; setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>> }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        setMobileMenuOpen(false);
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("Falha ao sair: " + error.message);
        } else {
            navigate('/login');
        }
    };

    return (
        <>
            <div className="flex flex-col flex-1">
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

                <nav className="flex-1 px-4 py-4 space-y-1.5">
                    {navigation.map((item) => {
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={onLinkClick}
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

            <div className="p-4 border-t border-sidebar-border bg-gradient-to-t from-sidebar-accent/30 to-transparent">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-xl"
                    onClick={handleSignOut}
                >
                    <LogOut className="h-5 w-5 mr-3" />
                    <span>Sair</span>
                </Button>
            </div>
        </>
    );
};