// src/pages/Settings.tsx

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, Info, CheckCircle, Smartphone, Clock, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Importar componentes Select
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    ownerName: "",
    phoneNumber: "",
    businessHours: "",
    logoUrl: "",
    organizationType: "", // <-- Novo estado para o tipo
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
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
        // Incluir organization_type no select
        const { data: orgData } = await supabase.from('organizations').select('*, organization_type').eq('id', profile.organization_id).single();
        if (orgData) {
          setFormData({
            name: orgData.name || "",
            address: orgData.address || "",
            ownerName: orgData.owner_name || "",
            phoneNumber: orgData.phone_number || "",
            businessHours: orgData.business_hours || "",
            logoUrl: orgData.logo_url || "",
            organizationType: orgData.organization_type || "Academia", // <-- Carregar tipo, default para Academia se nulo
          });
        }
      }
    }
    setLoading(false);
  };

  // ... handleLogoUpload (sem alterações) ...
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !organizationId) return;
    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${organizationId}/logo.${fileExt}`;

    setUploading(true);
    try {
      const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
      const publicUrlWithCacheBuster = `${urlData.publicUrl}?t=${new Date().getTime()}`;
      const { error: updateError } = await supabase.from('organizations').update({ logo_url: urlData.publicUrl }).eq('id', organizationId);
      if (updateError) throw updateError;
      setFormData({ ...formData, logoUrl: publicUrlWithCacheBuster });
      toast.success("Logo enviado com sucesso");
    } catch (error: any) {
      toast.error("Falha ao enviar o logo.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };


  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      toast.error("ID da organização não encontrado.");
      return;
    }
    setSaving(true);
    try {
      // Incluir organization_type no update
      const { error } = await supabase.from('organizations').update({
        name: formData.name,
        address: formData.address,
        owner_name: formData.ownerName,
        phone_number: formData.phoneNumber,
        business_hours: formData.businessHours,
        organization_type: formData.organizationType, // <-- Salvar o tipo
      }).eq('id', organizationId);
      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Falha ao salvar as configurações");
    } finally {
      setSaving(false);
    }
  };

  // ... handlePasswordUpdate (sem alterações) ...
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("As novas senhas não coincidem.");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error.message || "Falha ao alterar a senha.");
    } finally {
      setSavingPassword(false);
    }
  };


  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 w-full">
        {/* Header da Página (sem alterações) */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Configurações
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Gerencie as informações e automações da sua organização.
          </p>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="automation">Automação</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            {loading ? (
              <Card className="mt-4"><CardContent className="p-12"><div className="space-y-4">{[1, 2, 3, 4].map((i) => (<Skeleton key={i} className="h-12 bg-muted rounded" />))}</div></CardContent></Card>
            ) : (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Perfil da Academia</CardTitle>
                  <CardDescription>Atualize as informações que seus alunos e administradores veem.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleDetailsSubmit} className="space-y-6">
                    {/* Logo (sem alterações) */}
                    <div className="space-y-2">
                      <Label>Logo</Label>
                      <div className="flex items-center gap-4">
                        {formData.logoUrl ? (<img src={formData.logoUrl} alt="Logo da Organização" className="h-20 w-20 object-cover rounded-lg border" />) : (<div className="h-20 w-20 bg-muted rounded-lg flex items-center justify-center"><span className="text-xs text-muted-foreground">Sem Logo</span></div>)}
                        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/png, image/jpeg" style={{ display: 'none' }} disabled={uploading} />
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}><Upload className="mr-2 h-4 w-4" />{uploading ? "Enviando..." : "Enviar Logo"}</Button>
                      </div>
                    </div>
                    {/* Nome (sem alterações) */}
                    <div className="space-y-2"><Label htmlFor="name">Nome *</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={saving} /></div>

                    {/* ---- NOVO CAMPO TIPO DE ORGANIZAÇÃO ---- */}
                    <div className="space-y-2">
                      <Label htmlFor="organizationType">Tipo de Organização *</Label>
                      <Select
                        value={formData.organizationType}
                        onValueChange={(value) => setFormData({ ...formData, organizationType: value })}
                        required
                        disabled={saving}
                      >
                        <SelectTrigger id="organizationType">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Academia">Academia</SelectItem>
                          <SelectItem value="Centro de Treinamento">Centro de Treinamento</SelectItem>
                          <SelectItem value="Personal Trainer">Personal Trainer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {/* -------------------------------------- */}

                    {/* Endereço (sem alterações) */}
                    <div className="space-y-2"><Label htmlFor="address">Endereço</Label><Textarea id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} disabled={saving} rows={3} /></div>
                    {/* Nome Responsável (sem alterações) */}
                    <div className="space-y-2"><Label htmlFor="ownerName">Nome do Responsável</Label><Input id="ownerName" value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} disabled={saving} /></div>
                    {/* Telefone (sem alterações) */}
                    <div className="space-y-2"><Label htmlFor="phoneNumber">Telefone</Label><Input id="phoneNumber" type="tel" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} disabled={saving} /></div>
                    {/* Horário (sem alterações) */}
                    <div className="space-y-2"><Label htmlFor="businessHours">Horário de Funcionamento</Label><Textarea id="businessHours" value={formData.businessHours} onChange={(e) => setFormData({ ...formData, businessHours: e.target.value })} placeholder="Ex: Seg-Sex: 6h-22h, Sab-Dom: 8h-18h" disabled={saving} rows={3} /></div>
                    {/* Botão Salvar (sem alterações) */}
                    <div className="flex justify-end pt-4"><Button type="submit" disabled={saving || uploading}>{saving ? "Salvando..." : "Salvar Alterações"}</Button></div>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Automação e Segurança (sem alterações) */}
          <TabsContent value="automation">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5 text-primary" />Como Funciona a Automação de Lembretes</CardTitle>
                <CardDescription>Entenda como o sistema ajuda a reduzir a inadimplência e a reter alunos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Nosso sistema monitora automaticamente as datas de vencimento de todas as matrículas. Quando uma matrícula está prestes a vencer, uma sequência de lembretes é enviada via WhatsApp para o aluno, incentivando a renovação.
                </p>
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><Clock className="h-4 w-4" />Cronograma de Envio</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>**3 dias** antes do vencimento</li>
                    <li>**1 dia** antes do vencimento (no dia anterior)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />Pré-requisitos para Funcionar</h4>
                  <ul className="list-disc list-inside text-sm space-y-2 text-muted-foreground">
                    <li>
                      O número de telefone do aluno deve estar cadastrado na tela de "Alunos".
                    </li>
                    <li>
                      O número deve estar no formato internacional completo, incluindo o código do país (+55), DDD e o número. Ex: <span className="font-mono text-xs bg-muted p-1 rounded">+5513999998888</span>.
                    </li>
                  </ul>
                </div>
                <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-800"><Smartphone className="h-4 w-4" />Status da Integração com o WhatsApp</h4>
                  <p className="text-sm text-blue-700">
                    Sua conta está configurada para enviar mensagens através do parceiro oficial Twilio. Todas as mensagens são enviadas usando modelos pré-aprovados pela Meta para garantir a entrega.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>Altere sua senha de acesso à plataforma.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      minLength={6}
                      required
                      disabled={savingPassword}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      minLength={6}
                      required
                      disabled={savingPassword}
                    />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={savingPassword}>
                      <Lock className="h-4 w-4 mr-2" />
                      {savingPassword ? "Salvando..." : "Salvar Nova Senha"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default Settings;