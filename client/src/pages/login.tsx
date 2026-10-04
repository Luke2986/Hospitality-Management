import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { ApiError, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, Redirect, useLocation } from "wouter";
import { useAuth, AUTH_QUERY_KEY } from "@/hooks/use-auth";
import { LogIn } from "lucide-react";
import { useState } from "react";

const loginSchema = z.object({
  email: z.string().email("Indirizzo email non valido"),
  password: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const res = await apiRequest("POST", "/api/auth/login", data);
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
      toast({
        title: "Successo",
        description: "Accesso effettuato con successo",
      });
      setLocation("/dashboard");
    },
    onError: (error: Error, variables) => {
      if (error instanceof ApiError && error.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(variables.email);
        return;
      }
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/resend-verification", { email });
      return res.json();
    },
    onSuccess: (data: { message: string }) => {
      toast({ title: "Email inviata", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: LoginForm) => {
    setUnverifiedEmail(null);
    loginMutation.mutate(data);
  };

  if (user) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold flex items-center gap-2">
            <LogIn className="w-8 h-8 text-primary" />
            Bentornato
          </CardTitle>
          <CardDescription>
            Inserisci le tue credenziali per accedere alla dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                        Password dimenticata?
                      </Link>
                    </div>
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
              {unverifiedEmail && (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-2" data-testid="alert-email-not-verified">
                  <p>Devi confermare il tuo indirizzo email prima di accedere. Controlla la posta, anche nello spam.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={resendMutation.isPending}
                    onClick={() => resendMutation.mutate(unverifiedEmail)}
                    data-testid="button-resend-verification"
                  >
                    {resendMutation.isPending ? "Invio in corso..." : "Invia di nuovo l'email"}
                  </Button>
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? "Accesso in corso..." : "Accedi"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Non hai un account?{" "}
            <Link href="/signup" className="text-primary hover:underline" data-testid="link-signup">
              Registrati
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
