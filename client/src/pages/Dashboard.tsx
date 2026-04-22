import { trpc } from "@/lib/trpc";
import { CalendarDays, Users, CheckCircle, XCircle, Clock, TrendingUp, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  scheduled: { label: "Agendado", color: "bg-blue-100 text-blue-800" },
  confirmed: { label: "Confirmado", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
  rescheduled: { label: "Remarcado", color: "bg-yellow-100 text-yellow-800" },
};

const COLORS = ["#1a5f3f", "#4ade80", "#d4af37", "#fbbf24"];

export default function Dashboard() {
  const { data: stats } = trpc.appointments.stats.useQuery();
  const { data: appointments } = trpc.appointments.list.useQuery({});
  const { data: professionals } = trpc.professionals.list.useQuery();
  const { data: specialties } = trpc.specialties.list.useQuery();

  const upcoming = (appointments ?? [])
    .filter((a) => a.status === "scheduled" || a.status === "confirmed")
    .filter((a) => new Date(a.dateTime) >= new Date())
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 5);

  // Preparar dados para gráfico de especialidades
  const specialtyMap = new Map(specialties?.map((s) => [s.id, s.name]) ?? []);
  const specialtyData = Object.entries(stats?.bySpecialty ?? {}).map(([key, count]) => {
    const specialtyId = parseInt(key.replace("specialty_", ""));
    const name = specialtyMap.get(specialtyId) ?? `Especialidade ${specialtyId}`;
    return { name, value: count };
  });

  // Preparar dados para gráfico de receita por profissional
  const revenueData = Object.values(stats?.revenueByProfessional ?? {})
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map((item) => ({
      name: item.name,
      revenue: Math.round(item.revenue),
      count: item.count,
    }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Visão geral do sistema de agendamento
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total de Agendamentos"
          value={stats?.total ?? 0}
          icon={<CalendarDays className="w-5 h-5 text-primary" />}
          description="Todos os tempos"
        />
        <StatCard
          title="Últimos 30 Dias"
          value={stats?.last30Days ?? 0}
          icon={<TrendingUp className="w-5 h-5 text-accent-foreground" />}
          description="Tendência recente"
          accent
        />
        <StatCard
          title="Confirmados"
          value={stats?.confirmedCount ?? 0}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          description="Presença confirmada"
        />
        <StatCard
          title="Cancelados"
          value={stats?.cancelledCount ?? 0}
          icon={<XCircle className="w-5 h-5 text-destructive" />}
          description="Consultas canceladas"
        />
        <StatCard
          title="Taxa de Confirmação"
          value={`${stats?.confirmationRate ?? 0}%`}
          icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
          description="Confirmados vs cancelados"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Especialidades Chart */}
        {specialtyData.length > 0 && (
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Agendamentos por Especialidade (30 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={specialtyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="#1a5f3f" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Receita por Profissional */}
        {revenueData.length > 0 && (
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Receita Estimada por Profissional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="revenue" fill="#4ade80" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximas Consultas */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Próximas Consultas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhuma consulta agendada próxima.
                </div>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((appt) => {
                    const status = STATUS_LABELS[appt.status] ?? STATUS_LABELS.scheduled;
                    return (
                      <div
                        key={appt.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <CalendarDays className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {appt.phone}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(appt.dateTime), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <div>
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Por Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(STATUS_LABELS).map(([key, { label, color }]) => {
                  const count = stats?.byStatus?.[key as keyof typeof stats.byStatus] ?? 0;
                  const total = stats?.total ?? 1;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Profissionais */}
          <Card className="shadow-sm border-border mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Profissionais Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(professionals ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Nenhum profissional cadastrado.
                </p>
              ) : (
                <div className="space-y-2">
                  {(professionals ?? []).slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                        <span className="text-accent-foreground text-xs font-bold">
                          {p.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                        {p.crp && <p className="text-xs text-muted-foreground">CRP {p.crp}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
  accent,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description: string;
  accent?: boolean;
}) {
  return (
    <Card className={`shadow-sm border-border ${accent ? "bg-accent/5" : ""}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="ml-4">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
