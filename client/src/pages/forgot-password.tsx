import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AuthCard } from "@/components/auth/auth-card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({ email: z.string().email("Indirizzo email non valido") });

export default function ForgotPassword() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof schema>) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", data);
      return res.json();
    },
    onSuccess: () => setSent(true),
    onError: (error: Error) => toast({ title: "Errore", description: error.message, variant: "destructive" }),
  });

  if (sent) {
    return (
      <AuthCard
        icon={MailCheck}
        title="Controlla la tua email"
        description="Se l'indirizzo è registrato, riceverai un link per reimpostare la password. Il link scade tra 1 ora."
      >
        <Link href="/login" className="text-sm text-primary hover:underline">
          Torna al login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      icon={KeyRound}
      title="Password dimenticata"
      description="Inserisci l'email del tuo account: ti invieremo un link per sceglierne una nuova."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="tua@email.com" data-testid="input-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-send-reset">
            {mutation.isPending ? "Invio in corso..." : "Invia link"}
          </Button>
        </form>
      </Form>
      <div className="mt-4 text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          Torna al login
        </Link>
      </div>
    </AuthCard>
  );
}
