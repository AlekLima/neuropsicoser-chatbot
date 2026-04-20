import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Save, Eye, EyeOff, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type SettingsMap = Record<string, string>;

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: rawSettings, isLoading } = trpc.settings.getAll.useQuery();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rawSettings) {
      setSettings(rawSettings);
    }
  }, [rawSettings]);

  const updateMutation = trpc.settings.updateMany.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      utils.settings.getAll.invalidate();
      setSaving(false);
    },
    onError: (e) => {
      toast.error(e.message);
      setSaving(false);
    },
  });

  function set(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setSaving(true);
    const entries = Object.entries(settings).map(([key, value]) => ({ key, value }));
    updateMutation.mutate(entries);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure as integrações e informações da clínica
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar tudo"}
        </Button>
      </div>

      {/* WhatsApp */}
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-base">WhatsApp Business API</CardTitle>
          <CardDescription>
            Credenciais da API oficial do WhatsApp (Meta for Developers)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Token de Acesso (Bearer Token)</Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                placeholder="EAAVAz8hZATygBRe9EUGI4a..."
                value={settings["whatsapp_token"] ?? ""}
                onChange={(e) => set("whatsapp_token", e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Encontrado em: Meta for Developers → WhatsApp → Configuração da API → Token de acesso
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>ID do Número de Telefone</Label>
            <Input
              placeholder="1108180739045692"
              value={settings["whatsapp_phone_id"] ?? ""}
              onChange={(e) => set("whatsapp_phone_id", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Encontrado em: Meta for Developers → WhatsApp → Configuração da API → Identificação do número de telefone
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Token de Verificação do Webhook</Label>
            <Input
              placeholder="neuropsicoser_verify_2024"
              value={settings["whatsapp_verify_token"] ?? ""}
              onChange={(e) => set("whatsapp_verify_token", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Use este token ao configurar o webhook no Meta for Developers. URL do webhook:{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                {window.location.origin}/api/webhook
              </code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Atendente */}
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-base">Redirecionamento para Atendente</CardTitle>
          <CardDescription>
            Número para onde o paciente será direcionado ao digitar ATENDENTE
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label>Número do Atendente (com DDI)</Label>
            <Input
              placeholder="5585999999999"
              value={settings["attendant_phone"] ?? ""}
              onChange={(e) => set("attendant_phone", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Formato: DDI + DDD + número. Ex: 5585999999999 (Brasil, Ceará)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar */}
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-base">Google Calendar</CardTitle>
          <CardDescription>
            Credenciais da conta de serviço para integração com Google Agenda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 space-y-1">
              <p className="font-medium">Como configurar:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
                <li>Acesse o Google Cloud Console e crie um projeto</li>
                <li>Ative a API do Google Calendar</li>
                <li>Crie uma Conta de Serviço e baixe o JSON de credenciais</li>
                <li>Compartilhe cada agenda do Google com o e-mail da conta de serviço</li>
                <li>Cole o conteúdo do JSON abaixo</li>
              </ol>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>JSON de Credenciais da Conta de Serviço</Label>
            <Textarea
              placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'}
              value={settings["google_calendar_credentials"] ?? ""}
              onChange={(e) => set("google_calendar_credentials", e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clínica */}
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-base">Informações da Clínica</CardTitle>
          <CardDescription>
            Dados exibidos nas mensagens do chatbot
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome da Clínica</Label>
            <Input
              placeholder="Neuropsicoser — Saúde Mental e Desenvolvimento"
              value={settings["clinic_name"] ?? ""}
              onChange={(e) => set("clinic_name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input
              placeholder="Rua Maria Tomásia, 1355 - Aldeota, Fortaleza - CE"
              value={settings["clinic_address"] ?? ""}
              onChange={(e) => set("clinic_address", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Salvando..." : "Salvar todas as configurações"}
        </Button>
      </div>
    </div>
  );
}
