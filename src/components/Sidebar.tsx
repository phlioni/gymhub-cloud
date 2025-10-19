import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Package,
  Settings,
  LogOut,
  Dumbbell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Alunos", href: "/students", icon: Users },
  { name: "Modalidades", href: "/modalities", icon: GraduationCap },
  { name: "Produtos", href: "/products", icon: Package },
  { name: "Configurações", href: "/settings", icon: Settings },
];

interface SidebarProps {
  organizationName?: string;
  logoUrl?: string | null;
}

export const Sidebar = ({ organizationName, logoUrl }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Falha ao sair");
    } else {
      navigate('/');
    }
  };

  return (
    // CORREÇÃO AQUI: Adicionado h-screen para altura total e sticky top-0 para fixar
    <div className="flex flex-col w-72 bg-sidebar border-r border-sidebar-border shadow-sm h-screen sticky top-0">
      <div className="p-6 border-b border-sidebar-border bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-12 w-12 rounded-xl object-cover shadow-md ring-2 ring-primary/10" />
          ) : (
            <div className="p-2.5 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-md">
              <Dumbbell className="h-7 w-7 text-white" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground tracking-tight">
              {organizationName || "GymHub"}
            </span>
            <span className="text-xs text-muted-foreground">Gestão Completa</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-md shadow-primary/25"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 transition-transform duration-200",
                isActive ? "scale-110" : "group-hover:scale-105"
              )} />
              <span className="font-medium">{item.name}</span>
              {isActive && (
                <div className="ml-auto h-2 w-2 rounded-full bg-white/90 shadow-sm animate-pulse" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border bg-gradient-to-t from-sidebar-accent/30 to-transparent">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-xl"
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span className="font-medium">Sair</span>
        </Button>
      </div>
    </div>
  );
};