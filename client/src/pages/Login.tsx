import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Leaf } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[oklch(0.17_0.035_218)] to-[oklch(0.22_0.04_215)]">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[oklch(0.17_0.035_218)] flex items-center justify-center mb-4 shadow-lg">
              <Leaf className="w-8 h-8 text-[oklch(0.7_0.12_155)]" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Neuropsicoser</h1>
            <p className="text-muted-foreground text-sm mt-1">Painel Administrativo</p>
          </div>

          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Faça login para acessar o painel de gerenciamento do chatbot.
            </p>
            <a
              href={getLoginUrl()}
              className="flex items-center justify-center w-full py-3 px-4 rounded-xl bg-[oklch(0.32_0.075_215)] text-white font-medium text-sm hover:bg-[oklch(0.28_0.075_215)] transition-colors shadow-sm"
            >
              Entrar com Manus
            </a>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Acesso restrito a administradores autorizados.
          </p>
        </div>
      </div>
    </div>
  );
}
