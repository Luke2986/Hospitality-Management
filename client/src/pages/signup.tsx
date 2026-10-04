import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { MailCheck, UserPlus } from "lucide-react";
import { useState } from "react";

const signupSchema = z.object({
  email: z.string().email("Indirizzo email non valido"),
  password: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
  fullName: z.string().min(2, "Il nome completo deve contenere almeno 2 caratteri"),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      const res = await apiRequest("POST", "/api/auth/signup", data);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      setSentTo(variables.email);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

  if (user) {
    return <Redirect to="/dashboard" />;
  }

  if (sentTo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold flex items-center gap-2">
              <MailCheck className="w-8 h-8 text-primary" />
              Controlla la tua email
            </CardTitle>
            <CardDescription data-testid="text-signup-sent">
              Abbiamo inviato a <span className="font-medium text-foreground">{sentTo}</span> un link per confermare
              l'account. Il link scade tra 24 ore. Se non arriva, controlla lo spam o prova ad accedere: potrai
              richiederne un altro.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-center">
            Hai già confermato?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Accedi
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <UserPlus className="w-8 h-8 text-primary" />
            Crea Account
          </CardTitle>
          <CardDescription>
            Inizia con la gestione della tua struttura ricettiva
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Mario Rossi"
                        data-testid="input-fullname"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="tua@email.com"
                        data-testid="input-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={signupMutation.isPending}
                data-testid="button-signup"
              >
                {signupMutation.isPending ? "Creazione account..." : "Crea Account"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Hai già un account?{" "}
            <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
              Accedi
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
