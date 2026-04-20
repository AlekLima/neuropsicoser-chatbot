import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Shield, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function InsurancePlans() {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");

  const { data: plans = [], isLoading } = trpc.insurancePlans.list.useQuery();

  const createMutation = trpc.insurancePlans.create.useMutation({
    onSuccess: () => {
      toast.success("Convênio cadastrado!");
      utils.insurancePlans.list.invalidate();
      setDialogOpen(false);
      setName("");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.insurancePlans.update.useMutation({
    onSuccess: () => {
      toast.success("Convênio atualizado!");
      utils.insurancePlans.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Nome do convênio é obrigatório.");
      return;
    }
    createMutation.mutate({ name: name.trim() });
  }

  function toggleActive(id: number, active: boolean) {
    updateMutation.mutate({ id, active: !active });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Convênios</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os planos de saúde aceitos pela clínica
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Convênio
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum convênio cadastrado</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/30 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Cadastrado em {new Date(plan.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={plan.active ? "default" : "secondary"}
                    className={plan.active ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                  >
                    {plan.active ? "Ativo" : "Inativo"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => toggleActive(plan.id, plan.active)}
                    title={plan.active ? "Desativar" : "Ativar"}
                  >
                    {plan.active ? (
                      <ToggleRight className="w-5 h-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Convênio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome do convênio *</Label>
              <Input
                placeholder="Ex: Unimed, Bradesco Saúde..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
