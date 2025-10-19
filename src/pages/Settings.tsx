import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    ownerName: "",
    phoneNumber: "",
    businessHours: "",
    logoUrl: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadOrganizationData();
  }, []);

  const loadOrganizationData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);
        const { data: orgData } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single();
        if (orgData) {
          setFormData({
            name: orgData.name || "",
            address: orgData.address || "",
            ownerName: orgData.owner_name || "",
            phoneNumber: orgData.phone_number || "",
            businessHours: orgData.business_hours || "",
            logoUrl: orgData.logo_url || "",
          });
        }
      }
    }
    setLoading(false);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !organizationId) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${organizationId}/logo.${fileExt}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(fileName);

      const publicUrlWithCacheBuster = `${urlData.publicUrl}?t=${new Date().getTime()}`;

      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', organizationId);

      if (updateError) throw updateError;

      setFormData({ ...formData, logoUrl: publicUrlWithCacheBuster });
      toast.success("Logo enviado com sucesso");
    } catch (error: any) {
      toast.error("Falha ao enviar o logo. Verifique as permissões do Storage.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast.error("ID da organização não encontrado. Recarregue a página.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: formData.name,
          address: formData.address,
          owner_name: formData.ownerName,
          phone_number: formData.phoneNumber,
          business_hours: formData.businessHours,
        })
        .eq('id', organizationId);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Falha ao salvar as configurações");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary/[0.02] via-background to-accent/[0.02]">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent tracking-tight">
              Configurações
            </h1>
            <p className="text-base text-muted-foreground">
              Gerencie as informações da sua organização
            </p>
          </div>

          {loading ? (
            <Card className="shadow-lg border-border/50">
              <CardContent className="p-12">
                <div className="space-y-5">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-14 bg-muted/50 rounded-lg" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-lg border-border/50">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl">Detalhes da Organização</CardTitle>
                <CardDescription className="text-base">
                  Atualize as informações da sua academia ou CT
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-7">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Logo</Label>
                    <div className="flex items-center gap-5">
                      {formData.logoUrl ? (
                        <img
                          src={formData.logoUrl}
                          alt="Logo da Organização"
                          className="h-24 w-24 object-cover rounded-xl border-2 border-border/50 shadow-md"
                        />
                      ) : (
                        <div className="h-24 w-24 bg-muted/50 rounded-xl flex items-center justify-center border-2 border-dashed border-border">
                          <span className="text-xs text-muted-foreground font-medium">Sem Logo</span>
                        </div>
                      )}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                        accept="image/png, image/jpeg"
                        style={{ display: 'none' }}
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="h-11 shadow-sm hover:shadow transition-all"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploading ? "Enviando..." : "Enviar Logo"}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-7 md:grid-cols-2">
                    <div className="space-y-3 md:col-span-2">
                      <Label htmlFor="name" className="text-sm font-medium">Nome *</Label>
                      <Input 
                        id="name" 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        required 
                        disabled={saving}
                        className="h-11 shadow-sm"
                      />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <Label htmlFor="address" className="text-sm font-medium">Endereço</Label>
                      <Textarea 
                        id="address" 
                        value={formData.address} 
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                        disabled={saving} 
                        rows={3}
                        className="shadow-sm resize-none"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="ownerName" className="text-sm font-medium">Nome do Responsável</Label>
                      <Input 
                        id="ownerName" 
                        value={formData.ownerName} 
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} 
                        disabled={saving}
                        className="h-11 shadow-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="phoneNumber" className="text-sm font-medium">Telefone</Label>
                      <Input 
                        id="phoneNumber" 
                        type="tel" 
                        value={formData.phoneNumber} 
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} 
                        disabled={saving}
                        className="h-11 shadow-sm"
                      />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <Label htmlFor="businessHours" className="text-sm font-medium">Horário de Funcionamento</Label>
                      <Textarea 
                        id="businessHours" 
                        value={formData.businessHours} 
                        onChange={(e) => setFormData({ ...formData, businessHours: e.target.value })} 
                        placeholder="Ex: Seg-Sex: 6h-22h, Sab-Dom: 8h-18h" 
                        disabled={saving} 
                        rows={3}
                        className="shadow-sm resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-6 border-t border-border/50">
                    <Button 
                      type="submit" 
                      disabled={saving || uploading}
                      className="h-11 px-8 shadow-md hover:shadow-lg transition-all"
                    >
                      {saving ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Settings;