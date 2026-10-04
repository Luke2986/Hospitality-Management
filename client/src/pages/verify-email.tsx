import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Loader2, MailCheck, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCard, takeTokenFromUrl } from "@/components/auth/auth-card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AUTH_QUERY_KEY } from "@/hooks/use-auth";

type State = { status: "loading" } | { status: "success" } | { status: "error"; message: string };

export default function VerifyEmail() {
  const [state, setState] = useState<State>({ status: "loading" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = takeTokenFromUrl();
    if (!token) {
      setState({ status: "error", message: "Link non valido." });
      return;
    }
    apiRequest("POST", "/api/auth/verify-email", { token })
      .then((res) => res.json())
      .then((user) => {
        queryClient.setQueryData(AUTH_QUERY_KEY, user);
        setState({ status: "success" });
      })
      .catch((err: Error) => setState({ status: "error", message: err.message }));
  }, []);

  if (state.status === "loading") {
    return <AuthCard icon={Loader2} title="Verifica in corso..." description="Stiamo confermando il tuo indirizzo email." />;
  }

  if (state.status === "error") {
    return (
      <AuthCard icon={MailX} title="Verifica non riuscita" description={state.message}>
        <p className="text-sm text-muted-foreground" data-testid="text-verify-error">
          Prova ad accedere: se l'email non è ancora confermata potrai richiedere un nuovo link.
        </p>
        <Button asChild className="w-full mt-4">
          <Link href="/login">Vai al login</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard icon={MailCheck} title="Email confermata" description="Il tuo account è attivo.">
      <Button asChild className="w-full" data-testid="button-go-dashboard">
        <Link href="/dashboard">Vai alla dashboard</Link>
      </Button>
    </AuthCard>
  );
}
