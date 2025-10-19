import { useState, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
    { name: "Configurações", href: "/settings", icon: Settings },
];

export default function AppLayout() {
    const [data, setData] = useState<AppLayoutData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserAndOrg = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                navigate("/");
                return;
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("role, organization_id")
                .eq("id", session.user.id)
                .single();

            if (profile?.role === "superadmin") {
                navigate("/super-admin");
                return;
            }

            let orgData = null;
            if (profile?.organization_id) {
                const { data } = await supabase
                    .from("organizations")
                    .select("name, logo_url")
                    .eq("id", profile.organization_id)
                    .single();
                orgData = data;
            }

            setData({ organization: orgData });
            setLoading(false);
        };

        fetchUserAndOrg();
    }, [navigate]);

    if (loading) {
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

    return (
        <div className="flex min-h-screen w-full bg-muted/30">
            {/* Sidebar para Desktop - Estilo Original */}
            <DesktopSidebar data={data} />

            {/* Conteúdo Principal */}
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
                            <MobileSidebar data={data} onLinkClick={() => setMobileMenuOpen(false)} />
                        </SheetContent>
                    </Sheet>
                    <h1 className="text-lg font-semibold">{data?.organization?.name || "GymHub"}</h1>
                </header>

                {/* Outlet para renderizar as páginas */}
                <div className="flex-1 overflow-y-auto">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

// --- Componentes Internos do Layout ---

const DesktopSidebar = ({ data }: { data: AppLayoutData | null }) => (
    <aside className="hidden md:flex md:flex-col md:w-72 border-r bg-sidebar">
        <SidebarContent data={data} />
    </aside>
);

const MobileSidebar = ({ data, onLinkClick }: { data: AppLayoutData | null; onLinkClick: () => void }) => (
    <nav className="flex h-full flex-col text-sm font-medium bg-sidebar">
        <SidebarContent data={data} onLinkClick={onLinkClick} />
    </nav>
);

const SidebarContent = ({ data, onLinkClick }: { data: AppLayoutData | null; onLinkClick?: () => void }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        toast.success("Você saiu com segurança.");
        navigate("/");
    };

    return (
        <>
            <div className="flex flex-col flex-1">
                {/* Header da Sidebar - Estilo Original */}
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
                                {data?.organization?.name || "GymHub"}
                            </span>
                            <span className="text-xs text-muted-foreground">Gestão Completa</span>
                        </div>
                    </div>
                </div>

                {/* Navegação da Sidebar - Estilo Original */}
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

            {/* Footer da Sidebar - Estilo Original */}
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