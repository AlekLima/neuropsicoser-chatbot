import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  type: "user" | "bot";
  text: string;
  timestamp: Date;
}

export default function ChatSimulator() {
  const [phone, setPhone] = useState("+55 (85) 98765-4321");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      text: "👋 Bem-vindo ao Simulador de Chat da Neuropsicoser! Digite seu número de telefone (com DDD) e comece a testar o fluxo do chatbot.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: conversation } = trpc.conversations.getByPhone.useQuery({ phone });
  const simulateMutation = trpc.conversations.simulate.useMutation();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await simulateMutation.mutateAsync({
        phone,
        message: input,
      });

      // Add bot response (will be fetched from conversation state)
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        text: `✓ Mensagem processada. Etapa atual: ${result.step}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      toast.success("Mensagem enviada com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar mensagem");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "1",
        type: "bot",
        text: "👋 Bem-vindo ao Simulador de Chat da Neuropsicoser! Digite seu número de telefone (com DDD) e comece a testar o fluxo do chatbot.",
        timestamp: new Date(),
      },
    ]);
    setInput("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Simulador de Chat</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Teste o fluxo completo do chatbot sem precisar do WhatsApp
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-border h-[600px] flex flex-col">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                Chat em Tempo Real
              </CardTitle>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.type === "user"
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-muted text-muted-foreground rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {msg.timestamp.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input */}
            <div className="border-t p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !isLoading) {
                      handleSendMessage();
                    }
                  }}
                  disabled={isLoading}
                  className="text-sm"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !input.trim()}
                  size="sm"
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Enviar
                </Button>
              </div>
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Limpar Chat
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Telefone */}
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Telefone</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="+55 (85) 98765-4321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Use um número único para cada teste. O sistema mantém histórico por telefone.
              </p>
            </CardContent>
          </Card>

          {/* Estado Atual */}
          {conversation && (
            <Card className="shadow-sm border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Estado Atual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Etapa
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {conversation.step || "Não iniciada"}
                  </p>
                </div>

                {conversation.data && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Dados da Conversa
                    </p>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-40">
                      {JSON.stringify(conversation.data, null, 2)}
                    </pre>
                  </div>
                )}

                {conversation.updatedAt && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Última Atualização
                    </p>
                    <p className="text-sm text-foreground mt-1">
                      {new Date(conversation.updatedAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Guia de Teste */}
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Guia de Teste</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                <strong>1.</strong> Comece digitando qualquer coisa para iniciar o fluxo
              </p>
              <p>
                <strong>2.</strong> Escolha uma especialidade (1, 2, 3...)
              </p>
              <p>
                <strong>3.</strong> Escolha um profissional
              </p>
              <p>
                <strong>4.</strong> Escolha forma de pagamento (1 ou 2)
              </p>
              <p>
                <strong>5.</strong> Escolha um horário disponível
              </p>
              <p>
                <strong>6.</strong> Digite CONFIRMAR para agendar
              </p>
              <p>
                <strong>💡 Dica:</strong> Digite <strong>ATENDENTE</strong> em qualquer
                etapa para testar redirecionamento
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
