import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UserCheck } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

type ProfessionalForm = {
  name: string;
  crp: string;
  specialtyId: string;
  price: string;
  googleCalendarId: string;
  insuranceIds: number[];
};

const EMPTY_FORM: ProfessionalForm = {
  name: "",
  crp: "",
  specialtyId: "",
  price: "",
  googleCalendarId: "",
  insuranceIds: [],
};

export default function Professionals() {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ProfessionalForm>(EMPTY_FORM);

  const { data: professionals = [], isLoading } = trpc.professionals.list.useQuery();
  const { data: specialties = [] } = trpc.specialties.list.useQuery();
  const { data: insurancePlans = [] } = trpc.insurancePlans.list.useQuery();

  const createMutation = trpc.professionals.create.useMutation({
    onSuccess: () => {
      toast.success("Profissional cadastrado com sucesso!");
      utils.professionals.list.invalidate();
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.professionals.update.useMutation({
    onSuccess: () => {
      toast.success("Profissional atualizado!");
      utils.professionals.list.invalidate();
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.professionals.delete.useMutation({
    onSuccess: () => {
      toast.success("Profissional removido.");
      utils.professionals.list.invalidate();
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  function openCreate() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  async function openEdit(p: typeof professionals[0]) {
    setEditId(p.id);
    const insurances = await utils.professionals.getInsurances.fetch({ professionalId: p.id });
    setForm({
      name: p.name,
      crp: p.crp ?? "",
      specialtyId: String(p.specialtyId),
      price: p.price ?? "",
      googleCalendarId: p.googleCalendarId ?? "",
      insuranceIds: insurances,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.specialtyId) {
      toast.error("Nome e especialidade são obrigatórios.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      crp: form.crp || undefined,
      specialtyId: parseInt(form.specialtyId),
      price: form.price || undefined,
      googleCalendarId: form.googleCalendarId || undefined,
      insuranceIds: form.insuranceIds,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function toggleInsurance(id: number) {
    setForm((f) => ({
      ...f,
      insuranceIds: f.insuranceIds.includes(id)
        ? f.insuranceIds.filter((i) => i !== id)
        : [...f.insuranceIds, id],
    }));
  }

  const specialtyName = (id: number) =>
    specialties.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profissionais</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os profissionais disponíveis no chatbot
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Profissional
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : professionals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserCheck className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum profissional cadastrado</p>
            <p className="text-muted-foreground text-sm mt-1">
              Clique em "Novo Profissional" para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">CRP</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Especialidade</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Valor</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Google Calendar</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {professionals.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.crp ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{specialtyName(p.specialtyId)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.price ? `R$ ${Number(p.price).toFixed(2).replace(".", ",")}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.googleCalendarId ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          ✓ Configurado
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Não configurado</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(p.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Profissional" : "Novo Profissional"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome completo *</Label>
                <Input
                  placeholder="Ex: Dra. Ana Lima"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>CRP</Label>
                <Input
                  placeholder="Ex: 11/000000"
                  value={form.crp}
                  onChange={(e) => setForm({ ...form, crp: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Especialidade *</Label>
                <Select
                  value={form.specialtyId}
                  onValueChange={(v) => setForm({ ...form, specialtyId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor da consulta (R$)</Label>
                <Input
                  placeholder="Ex: 200.00"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>ID do Google Calendar</Label>
                <Input
                  placeholder="email@gmail.com ou ID"
                  value={form.googleCalendarId}
                  onChange={(e) => setForm({ ...form, googleCalendarId: e.target.value })}
                />
              </div>
            </div>

            {insurancePlans.length > 0 && (
              <div className="space-y-2">
                <Label>Convênios aceitos</Label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg">
                  {insurancePlans.map((plan) => (
                    <div key={plan.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`plan-${plan.id}`}
                        checked={form.insuranceIds.includes(plan.id)}
                        onCheckedChange={() => toggleInsurance(plan.id)}
                      />
                      <label
                        htmlFor={`plan-${plan.id}`}
                        className="text-sm text-foreground cursor-pointer"
                      >
                        {plan.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editId ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover profissional?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação desativará o profissional. Os agendamentos existentes não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
