import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MessageCircle, Search, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const STEP_LABELS: Record<string, string> = {
  start: "Início",
  choose_specialty: "Escolhendo especialidade",
  choose_professional: "Escolhendo profissional",
  choose_payment: "Escolhendo pagamento",
  confirm_particular: "Confirmando particular",
  choose_insurance: "Escolhendo convênio",
  choose_slot: "Escolhendo horário",
  confirm_appointment: "Confirmando agendamento",
  done: "Concluído",
  reminder_response: "Respondendo lembrete",
};

const STEP_COLORS: Record<string, string> = {
  start: "bg-blue-50 text-blue-700 border-blue-200",
  choose_specialty: "bg-purple-50 text-purple-700 border-purple-200",
  choose_professional: "bg-indigo-50 text-indigo-700 border-indigo-200",
  choose_payment: "bg-orange-50 text-orange-700 border-orange-200",
  confirm_particular: "bg-yellow-50 text-yellow-700 border-yellow-200",
  choose_insurance: "bg-teal-50 text-teal-700 border-teal-200",
  choose_slot: "bg-cyan-50 text-cyan-700 border-cyan-200",
  confirm_appointment: "bg-green-50 text-green-700 border-green-200",
  done: "bg-gray-50 text-gray-700 border-gray-200",
  reminder_response: "bg-pink-50 text-pink-700 border-pink-200",
};

type ConversationData = Record<string, unknown>;

export default function Conversations() {
  const [search, setSearch] = useState("");
  const { data: conversations = [], isLoading } = trpc.conversations.list.useQuery();
  const { data: selectedConv } = trpc.conversations.getByPhone.useQuery(
    { phone: search },
    { enabled: search.length > 0 }
  );

  const filtered = conversations.filter((c) =>
    !search || c.phone.includes(search)
  );

  const getStepLabel = (step: string) => STEP_LABELS[step] ?? step;
  const getStepColor = (step: string) => STEP_COLORS[step] ?? "bg-gray-50 text-gray-700 border-gray-200";

  const getTimeSince = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Agora";
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  const renderConvData = (data: ConversationData) => {
    const items = [];
    if (data.specialtyName) {
      items.push(
        <p key="specialty">
          <span className="text-muted-foreground">Especialidade:</span>{" "}
          <span className="font-medium">{String(data.specialtyName)}</span>
        </p>
      );
    }
    if (data.professionalName) {
      items.push(
        <p key="professional">
          <span className="text-muted-foreground">Profissional:</span>{" "}
          <span className="font-medium">{String(data.professionalName)}</span>
        </p>
      );
    }
    if (data.paymentType) {
      items.push(
        <p key="payment">
          <span className="text-muted-foreground">Pagamento:</span>{" "}
          <span className="font-medium">
            {data.paymentType === "particular" ? "Particular" : "Convênio"}
          </span>
        </p>
      );
    }
    if (data.selectedSlot && typeof data.selectedSlot === "object" && "label" in data.selectedSlot) {
      items.push(
        <p key="slot">
          <span className="text-muted-foreground">Horário:</span>{" "}
          <span className="font-medium">{String((data.selectedSlot as { label: string }).label)}</span>
        </p>
      );
    }
    return items;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Histórico de Conversas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acompanhe o progresso das conversas com pacientes
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Conversations List */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((conv) => (
              <div
                key={conv.phone}
                className="p-4 hover:bg-muted/20 transition-colors cursor-pointer"
                onClick={() => setSearch(conv.phone)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-mono font-medium text-foreground">{conv.phone}</p>
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium border ${getStepColor(conv.step)}`}
                      >
                        {getStepLabel(conv.step)}
                      </Badge>
                    </div>
                    {selectedConv?.phone === conv.phone && selectedConv?.data && (
                      <div className="mt-3 p-3 bg-muted rounded-lg text-sm space-y-1">
                        {renderConvData(selectedConv.data as ConversationData)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{getTimeSince(conv.updatedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        <p className="font-medium mb-1">💡 Dica:</p>
        <p>Clique em uma conversa para visualizar os dados da sessão e o progresso do fluxo.</p>
      </div>
    </div>
  );
}
