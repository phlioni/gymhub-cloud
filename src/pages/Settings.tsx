import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Upload, CheckCircle, Smartphone, Clock, Lock, Zap, Key, KeySquare, HelpCircle, Save, DollarSign } from "lucide-react"; // <<< 1. IMPORTAR DOLLARSIGN
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { IntegrationHelpDialog } from "@/components/IntegrationHelpDialog";
import { useAuthProtection } from "@/hooks/useAuthProtection";
import { StripeHelpDialog } from "@/components/settings/StripeHelpDialog";

const SUPABASE_URL = supabase.supabaseUrl;

const Settings = () => {
  const { organizationId, loading: authLoading } = useAuthProtection();
  const [dataLoading, setDataLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingAutomations, setSavingAutomations] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    ownerName: "",
    phoneNumber: "",
    businessHours: "",
    logoUrl: "",
    organizationType: "",
    paymentDetails: "",
  });
  const [reminderDays, setReminderDays] = useState<number[]>([3, 1]);
  const [integrationData, setIntegrationData] = useState({
    gympassApiKey: "",
    gympassIntegrationCode: "",
    totalpassApiKey: "",
    totalpassIntegrationCode: "",
    webhookUrl: `${SUPABASE_URL}/functions/v1/checkin-integration`,
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isGympassHelpOpen, setGympassHelpOpen] = useState(false);
  const [isTotalPassHelpOpen, setTotalPassHelpOpen] = useState(false);
  const [isStripeHelpOpen, setStripeHelpOpen] = useState(false);
  const [stripeOnboardingLoading, setStripeOnboardingLoading] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) {
      loadOrganizationData();
    }
  }, [organizationId]);

  const loadOrganizationData = async () => {
    setDataLoading(true);
    if (organizationId) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();
      if (orgData) {
        setFormData({
          name: orgData.name || "",
          address: orgData.address || "",
          ownerName: orgData.owner_name || "",
          phoneNumber: orgData.phone_number || "",
          businessHours: orgData.business_hours || "",
          logoUrl: orgData.logo_url || "",
          organizationType: orgData.organization_type || "Academia",
          paymentDetails: orgData.payment_details || "",
        });
        setReminderDays(orgData.reminder_days || [3, 1]);
        setIntegrationData({
          gympassApiKey: orgData.gympass_api_key || "",
          gympassIntegrationCode: orgData.gympass_integration_code ? String(orgData.gympass_integration_code) : "",
          totalpassApiKey: orgData.totalpass_api_key || "",
          totalpassIntegrationCode: orgData.totalpass_integration_code || "",
          webhookUrl: `${SUPABASE_URL}/functions/v1/checkin-integration`,
        });
        setStripeAccountId(orgData.stripe_account_id);
        setStripeAccountStatus(orgData.stripe_account_status);
      }
    }
    setDataLoading(false);
  };

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
    } finally {
      setUploading(false);
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    setSavingDetails(true);
    try {
      const { error } = await supabase.from('organizations').update({
        name: formData.name,
        address: formData.address,
        owner_name: formData.ownerName,
        phone_number: formData.phoneNumber,
        business_hours: formData.businessHours,
        organization_type: formData.organizationType,
        payment_details: formData.paymentDetails,
      }).eq('id', organizationId);
      if (error) throw error;
      toast.success("Detalhes salvos com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Falha ao salvar os detalhes");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleAutomationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    setSavingAutomations(true);
    try {
      const validDays = [...new Set(reminderDays.map(d => Number(d)).filter(d => d > 0))].sort((a, b) => b - a);
      const { error } = await supabase.from('organizations').update({
        reminder_days: validDays,
      }).eq('id', organizationId);
      if (error) throw error;
      setReminderDays(validDays);
      toast.success("Configurações de automação salvas!");
    } catch (error: any) {
      toast.error(error.message || "Falha ao salvar automações.");
    } finally {
      setSavingAutomations(false);
    }
  };

  const handleIntegrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;
    setSavingIntegrations(true);
    try {
      const { error } = await supabase.from('organizations').update({
        gympass_api_key: integrationData.gympassApiKey || null,
        gympass_integration_code: integrationData.gympassIntegrationCode ? parseInt(integrationData.gympassIntegrationCode, 10) : null,
        totalpass_api_key: integrationData.totalpassApiKey || null,
        totalpass_integration_code: integrationData.totalpassIntegrationCode || null,
      }).eq('id', organizationId);
      if (error) throw error;
      toast.success("Configurações de integração salvas!");
    } catch (error: any) {
      toast.error(error.message || "Falha ao salvar as configurações de integração");
    } finally {
      setSavingIntegrations(false);
    }
  };

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

  const handleReminderDayChange = (index: number, value: string) => {
    const newDays = [...reminderDays];
    newDays[index] = Number(value);
    setReminderDays(newDays);
  };

  const handleStripeOnboarding = async () => {
    setStripeOnboardingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account');

      if (error) throw error;
      // @ts-ignore
      if (data.error) throw new Error(data.error);

      // @ts-ignore
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        toast.error("Não foi possível iniciar a conexão com o Stripe.");
      }
    } catch (error: any) {
      toast.error("Erro ao conectar com Stripe", { description: error.message });
    } finally {
      setStripeOnboardingLoading(false);
    }
  };

  const isLoading = authLoading || dataLoading;

  return (
    <>
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6 w-full">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Configurações
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Gerencie as informações e automações da sua organização.
            </p>
          </div>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="integrations">Integrações</TabsTrigger>
              <TabsTrigger value="automation">Automação</TabsTrigger>
              <TabsTrigger value="security">Segurança</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              {isLoading ? (
                <Card className="mt-4"><CardContent className="p-12"><div className="space-y-4">{[1, 2, 3, 4].map((i) => (<Skeleton key={i} className="h-12 bg-muted rounded" />))}</div></CardContent></Card>
              ) : (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Perfil da Academia</CardTitle>
                    <CardDescription>Atualize as informações que seus alunos e administradores veem.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleDetailsSubmit} className="space-y-6">
                      {/* Logo */}
                      <div className="space-y-2">
                        <Label>Logo</Label>
                        <div className="flex items-center gap-4">
                          {formData.logoUrl ? (<img src={formData.logoUrl} alt="Logo da Organização" className="h-20 w-20 object-cover rounded-lg border" />) : (<div className="h-20 w-20 bg-muted rounded-lg flex items-center justify-center"><span className="text-xs text-muted-foreground">Sem Logo</span></div>)}
                          <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/png, image/jpeg" style={{ display: 'none' }} disabled={uploading} />
                          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}><Upload className="mr-2 h-4 w-4" />{uploading ? "Enviando..." : "Enviar Logo"}</Button>
                        </div>
                      </div>
                      <div className="space-y-2"><Label htmlFor="name">Nome *</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={savingDetails} /></div>
                      <div className="space-y-2">
                        <Label htmlFor="organizationType">Tipo de Organização *</Label>
                        <Select
                          value={formData.organizationType}
                          onValueChange={(value) => setFormData({ ...formData, organizationType: value })}
                          required
                          disabled={savingDetails}
                        >
                          <SelectTrigger id="organizationType"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Academia">Academia</SelectItem>
                            <SelectItem value="Centro de Treinamento">Centro de Treinamento</SelectItem>
                            <SelectItem value="Personal Trainer">Personal Trainer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label htmlFor="address">Endereço</Label><Textarea id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} disabled={savingDetails} rows={3} /></div>
                      <div className="space-y-2"><Label htmlFor="paymentDetails">Chave PIX ou Link de Pagamento (Para Lembretes)</Label><Input id="paymentDetails" value={formData.paymentDetails} onChange={(e) => setFormData({ ...formData, paymentDetails: e.target.value })} disabled={savingDetails} placeholder="Insira sua chave PIX ou o link para pagamento" /></div>
                      <div className="space-y-2"><Label htmlFor="ownerName">Nome do Responsável</Label><Input id="ownerName" value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} disabled={savingDetails} /></div>
                      <div className="space-y-2"><Label htmlFor="phoneNumber">Telefone</Label><Input id="phoneNumber" type="tel" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} disabled={savingDetails} /></div>
                      <div className="space-y-2"><Label htmlFor="businessHours">Horário de Funcionamento</Label><Textarea id="businessHours" value={formData.businessHours} onChange={(e) => setFormData({ ...formData, businessHours: e.target.value })} placeholder="Ex: Seg-Sex: 6h-22h, Sab-Dom: 8h-18h" disabled={savingDetails} rows={3} /></div>
                      <div className="flex justify-end pt-4"><Button type="submit" disabled={savingDetails || uploading}>{savingDetails ? "Salvando..." : "Salvar Alterações"}</Button></div>
                    </form>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="integrations">
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-accent" />Integrações</CardTitle>
                  <CardDescription>Configure conexões com plataformas de benefício e sistemas de pagamento.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleIntegrationSubmit} className="space-y-6">
                    {/* --- INÍCIO: BLOCO STRIPE CONNECT ATUALIZADO --- */}
                    <div className="space-y-4 border p-4 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 shadow-sm">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                        <h4 className="font-semibold text-lg flex items-center gap-2 text-primary">
                          <DollarSign className="h-5 w-5" />
                          Stripe Connect (Recebimentos Online)
                        </h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setStripeHelpOpen(true)}
                        >
                          <HelpCircle className="h-4 w-4 mr-1.5" /> Como funciona?
                        </Button>
                      </div>

                      {stripeAccountStatus === 'enabled' ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <p className="font-medium">Sua conta Stripe está ativa e conectada!</p>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">
                            {stripeAccountId ?
                              `Sua conta Stripe está conectada mas pendente (${stripeAccountStatus}). Finalize o cadastro no Stripe.` :
                              "Conecte sua conta Stripe para aceitar pagamentos de alunos (Cartão de Crédito, PIX, Boleto) e receber seus repasses rapidamente em D+2 dias úteis."
                            }
                          </p>
                          <Button
                            type="button"
                            onClick={handleStripeOnboarding}
                            disabled={stripeOnboardingLoading}
                            className="shadow-md"
                          >
                            {stripeOnboardingLoading ? "Aguarde..." : (stripeAccountId ? "Continuar Cadastro no Stripe" : "Conectar com Stripe")}
                          </Button>
                        </>
                      )}
                    </div>
                    {/* --- FIM: BLOCO STRIPE CONNECT --- */}

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="webhookUrl">Webhook URL (Seu Endpoint de Integração)</Label>
                      <Input id="webhookUrl" value={integrationData.webhookUrl} readOnly className="font-mono bg-muted" title="Copie este URL e cole no portal de integração do Gympass/TotalPass" />
                      <p className="text-xs text-muted-foreground">Este é o endereço do seu sistema que deve ser configurado no portal das plataformas para receber os pedidos de check-in.</p>
                    </div>

                    <Separator />

                    <div className="space-y-4 border p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-lg flex items-center gap-2 text-green-600"><CheckCircle className="h-5 w-5" /> Gympass (Wellhub)</h4>
                        <Button type="button" variant="outline" size="sm" onClick={() => setGympassHelpOpen(true)}><HelpCircle className="h-4 w-4 mr-1.5" /> Como Configurar?</Button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gympassApiKey">Chave Secreta do Webhook (Secret) * <Key className="h-4 w-4 inline text-muted-foreground" /></Label>
                        <Input id="gympassApiKey" value={integrationData.gympassApiKey} onChange={(e) => setIntegrationData({ ...integrationData, gympassApiKey: e.target.value })} placeholder="Chave secreta configurada no Supabase (GYMPASS_WEBHOOK_SECRET)" disabled={savingIntegrations} type="password" />
                        <p className="text-xs text-muted-foreground">Esta chave é usada para verificar a assinatura do webhook. Deve ser a mesma configurada no Supabase.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gympassIntegrationCode">ID da Academia (Gym ID) * <KeySquare className="h-4 w-4 inline text-muted-foreground" /></Label>
                        <Input id="gympassIntegrationCode" type="number" value={integrationData.gympassIntegrationCode} onChange={(e) => setIntegrationData({ ...integrationData, gympassIntegrationCode: e.target.value })} placeholder="ID Numérico da sua unidade no Gympass" disabled={savingIntegrations} />
                        <p className="text-xs text-muted-foreground">Este é o ID numérico da sua academia/unidade no portal Gympass/Wellhub.</p>
                      </div>
                    </div>
                    <div className="space-y-4 border p-4 rounded-lg">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-lg flex items-center gap-2 text-blue-600"><CheckCircle className="h-5 w-5" /> TotalPass</h4>
                        <Button type="button" variant="outline" size="sm" onClick={() => setTotalPassHelpOpen(true)}><HelpCircle className="h-4 w-4 mr-1.5" /> Como Configurar?</Button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="totalpassApiKey">Chave Secreta do Webhook (Secret) * <Key className="h-4 w-4 inline text-muted-foreground" /></Label>
                        <Input id="totalpassApiKey" value={integrationData.totalpassApiKey} onChange={(e) => setIntegrationData({ ...integrationData, totalpassApiKey: e.target.value })} placeholder="Chave secreta para validação do webhook TotalPass" disabled={savingIntegrations} type="password" />
                        <p className="text-xs text-muted-foreground">Esta chave é usada para verificar a assinatura do webhook. Deve ser a mesma configurada no Supabase.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="totalpassIntegrationCode">Código de Integração *</Label>
                        <Input id="totalpassIntegrationCode" value={integrationData.totalpassIntegrationCode} onChange={(e) => setIntegrationData({ ...integrationData, totalpassIntegrationCode: e.target.value })} placeholder="Código da Academia/Unidade no TotalPass (Alfanumérico)" disabled={savingIntegrations} />
                        <p className="text-xs text-muted-foreground">Este é o código alfanumérico da sua unidade no portal TotalPass.</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={savingIntegrations}>{savingIntegrations ? "Salvando..." : "Salvar Integrações"}</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="automation">
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />Automação de Lembretes de Vencimento</CardTitle>
                  <CardDescription>Configure quando os lembretes de renovação devem ser enviados via WhatsApp.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAutomationSubmit} className="space-y-6">
                    <div>
                      <Label>Cronograma de Envio</Label>
                      <p className="text-sm text-muted-foreground mb-4">Defina quantos dias antes do vencimento cada lembrete será enviado.</p>
                      <div className="space-y-3">
                        {reminderDays.map((day, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              value={day}
                              onChange={(e) => handleReminderDayChange(index, e.target.value)}
                              className="w-48"
                              disabled={savingAutomations}
                            />
                            <span className="text-sm text-muted-foreground">dias antes do vencimento</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500" />Pré-requisitos para Funcionar</h4>
                      <ul className="list-disc list-inside text-sm space-y-2 text-muted-foreground">
                        <li>O número de telefone do aluno deve estar cadastrado na tela de "Alunos".</li>
                        <li>O número deve estar no formato internacional completo (Ex: <span className="font-mono text-xs bg-muted p-1 rounded">+5513999998888</span>).</li>
                        <li>A "Chave PIX" (na aba Detalhes) ou um <span className="font-semibold text-foreground">Link de Pagamento Stripe</span> deve estar configurado para ser incluído na mensagem.</li>
                      </ul>
                    </div>
                    <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                      <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-800"><Smartphone className="h-4 w-4" />Status da Integração com o WhatsApp</h4>
                      <p className="text-sm text-blue-700">Sua conta está configurada para enviar mensagens através do parceiro oficial Twilio.</p>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={savingAutomations}>
                        <Save className="h-4 w-4 mr-2" />
                        {savingAutomations ? "Salvando..." : "Salvar Automação"}
                      </Button>
                    </div>
                  </form>
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
                      <Input id="newPassword" type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} minLength={6} required disabled={savingPassword} placeholder="Mínimo 6 caracteres" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                      <Input id="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} minLength={6} required disabled={savingPassword} />
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

      <IntegrationHelpDialog
        platform="Gympass"
        open={isGympassHelpOpen}
        onOpenChange={setGympassHelpOpen}
        webhookUrl={integrationData.webhookUrl}
      />
      <IntegrationHelpDialog
        platform="TotalPass"
        open={isTotalPassHelpOpen}
        onOpenChange={setTotalPassHelpOpen}
        webhookUrl={integrationData.webhookUrl}
      />
      <StripeHelpDialog
        open={isStripeHelpOpen}
        onOpenChange={setStripeHelpOpen}
      />
    </>
  );
};

export default Settings;