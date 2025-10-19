import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Modality {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    pricing_type: string | null;
}

interface EditModalityDialogProps {
    modality: Modality | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export const EditModalityDialog = ({ modality, open, onOpenChange, onSuccess }: EditModalityDialogProps) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ name: "", description: "", price: "", pricing_type: "" });

    useEffect(() => {
        if (modality) {
            setFormData({
                name: modality.name || "",
                description: modality.description || "",
                price: modality.price ? String(modality.price) : "",
                pricing_type: modality.pricing_type || "",
            });
        }
    }, [modality]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modality) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('modalities')
                .update({
                    name: formData.name,
                    description: formData.description || null,
                    price: formData.price ? parseFloat(formData.price) : null,
                    pricing_type: formData.pricing_type || null,
                })
                .eq('id', modality.id);

            if (error) throw error;

            toast.success("Modalidade atualizada com sucesso");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Falha ao atualizar a modalidade");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Modalidade</DialogTitle>
                    <DialogDescription>
                        Atualize as informações da modalidade.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome *</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            disabled={loading}
                            rows={3}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price">Preço (R$)</Label>
                            <Input
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="Ex: 89.90"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pricing_type">Tipo de Preço</Label>
                            <Select
                                value={formData.pricing_type}
                                onValueChange={(value) => setFormData({ ...formData, pricing_type: value })}
                                disabled={loading}
                            >
                                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fixed">Valor Fixo</SelectItem>
                                    <SelectItem value="per_person">Por Aluno</SelectItem>
                                    <SelectItem value="per_hour">Por Hora</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};