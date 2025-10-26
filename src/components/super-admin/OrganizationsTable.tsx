import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, UserCheck, UserX } from "lucide-react";
import { OrganizationStats } from "@/pages/SuperAdmin";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";

interface OrganizationsTableProps {
  organizations: OrganizationStats[];
  loading: boolean;
  onRefresh: () => void;
}

export const OrganizationsTable = ({ organizations, loading, onRefresh }: OrganizationsTableProps) => {
  const [isToggling, setIsToggling] = useState<string | null>(null);

  const formatDateTime = (date: string | null) => {
    if (!date) return "Nunca";
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? "desativar" : "ativar";
    if (!confirm(`Tem certeza que deseja ${action} este usuário?`)) return;

    setIsToggling(userId);
    try {
      // Chama a Edge Function segura
      const { data, error } = await supabase.functions.invoke('toggle-user-status', {
        body: { userId: userId, activate: !currentStatus },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(`Usuário ${action} com sucesso!`);
      onRefresh();
    } catch (error: any) {
      toast.error(`Falha ao ${action} o usuário.`, { description: error.message });
    } finally {
      setIsToggling(null);
    }
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

  if (organizations.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Nenhuma organização encontrada. Crie a primeira!</p>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organização</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Alunos</TableHead>
            <TableHead>Receita (Matrículas)</TableHead>
            <TableHead>Receita (Produtos)</TableHead>
            <TableHead>Último Acesso do Admin</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org) => (
            <TableRow key={org.org_id}>
              <TableCell className="font-medium">
                <div>{org.org_name}</div>
                <div className="text-xs text-muted-foreground">{org.owner_email}</div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant={org.owner_is_active ? "default" : "destructive"}>
                  {org.owner_is_active ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="text-center font-medium">{org.student_count}</TableCell>
              <TableCell>{formatCurrency(org.total_enrollment_revenue)}</TableCell>
              <TableCell>{formatCurrency(org.total_product_revenue)}</TableCell>
              <TableCell>{formatDateTime(org.owner_last_sign_in_at)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isToggling === org.owner_id}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => handleToggleUserStatus(org.owner_id, org.owner_is_active)}
                      disabled={isToggling === org.owner_id}
                    >
                      {org.owner_is_active ? (
                        <><UserX className="mr-2 h-4 w-4" /><span>Desativar Usuário</span></>
                      ) : (
                        <><UserCheck className="mr-2 h-4 w-4" /><span>Ativar Usuário</span></>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};