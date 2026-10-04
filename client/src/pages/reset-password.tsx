import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, KeyRound, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AuthCard, takeTokenFromUrl } from "@/components/auth/auth-card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const schema = z
  .object({
    password: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "Le password non coincidono", path: ["confirm"] });

export default function ResetPassword() {
  const { toast } = useToast();
  const [token] = useState(takeTokenFromUrl);
  const [done, setDone] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const mutation = useMutation({
    mutationFn: async ({ password }: z.infer<typeof schema>) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, password });
      return res.json();
    },
    onSuccess: () => setDone(true),
    onError: (error: Error) => toast({ title: "Errore", description: error.message, variant: "destructive" }),
  });

  if (!token) {
    return (
      <AuthCard icon={MailX} title="Link non valido" description="Il link per reimpostare la password non è valido.">
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Richiedi un nuovo link
        </Link>
      </AuthCard>
    );
  }

  if (done) {
    return (
      <AuthCard
        icon={CheckCircle2}
        title="Password aggiornata"
        description="Per sicurezza abbiamo chiuso tutte le sessioni aperte. Accedi con la nuova password."
      >
        <Button asChild className="w-full" data-testid="button-go-login">
          <Link href="/login">Vai al login</Link>
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard icon={KeyRound} title="Nuova password" description="Scegli una nuova password per il tuo account.">
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nuova password</FormLabel>
                <FormControl>
                  <Input {...field} type="password" autoComplete="new-password" data-testid="input-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conferma password</FormLabel>
                <FormControl>
                  <Input {...field} type="password" autoComplete="new-password" data-testid="input-confirm" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-reset">
            {mutation.isPending ? "Salvataggio..." : "Salva password"}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
