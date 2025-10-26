import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OrganizationStats } from "@/pages/SuperAdmin";

interface ExtendTrialDialogProps {
    organization: OrganizationStats | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const ExtendTrialDialog = ({ organization, open, onOpenChange, onSuccess }: ExtendTrialDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [days, setDays] = useState("30");

    useEffect(() => {
        if (!open) {
            setDays("30");
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!organization) return;

        const daysToExtend = parseInt(days);
        if (isNaN(daysToExtend) || daysToExtend <= 0) {
            toast.error("Por favor, insira um número de dias válido.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.rpc('extend_trial', {
                org_id: organization.org_id,
                days_to_extend: daysToExtend
            });

            if (error) throw error;

            toast.success(`Trial para ${organization.org_name} estendido por ${daysToExtend} dias!`);
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error("Falha ao estender o trial.", { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Estender Período de Trial</DialogTitle>
                    <DialogDescription>
                        Aumente o período de avaliação para a organização <span className="font-bold">{organization?.org_name}</span>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="days">Dias para Adicionar</Label>
                        <Input
                            id="days"
                            type="number"
                            value={days}
                            onChange={(e) => setDays(e.target.value)}
                            placeholder="Ex: 30"
                            required
                            disabled={loading}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : "Confirmar Extensão"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};