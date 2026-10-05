import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  privacyControllerName: z.string().max(200),
  privacyControllerAddress: z.string().max(500),
  privacyContactEmail: z.union([z.literal(""), z.string().email("Email non valida")]),
});
type FormValues = z.infer<typeof formSchema>;
type PrivacySettings = { [K in keyof FormValues]: string | null };

export function PrivacySettingsCard() {
  const { toast } = useToast();
  const { data } = useQuery<PrivacySettings>({ queryKey: ["/api/account/privacy"] });
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { privacyControllerName: "", privacyControllerAddress: "", privacyContactEmail: "" },
  });

  useEffect(() => {
    if (!data) return;
    form.reset({
      privacyControllerName: data.privacyControllerName ?? "",
      privacyControllerAddress: data.privacyControllerAddress ?? "",
      privacyContactEmail: data.privacyContactEmail ?? "",
    });
  }, [data, form]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => (await apiRequest("PUT", "/api/account/privacy", values)).json(),
    onSuccess: (saved: PrivacySettings) => {
      queryClient.setQueryData(["/api/account/privacy"], saved);
      queryClient.invalidateQueries({ queryKey: ["/api/widget/properties"] });
      toast({ title: "Dati privacy salvati" });
    },
    onError: (error: Error) => toast({ title: "Errore", description: error.message, variant: "destructive" }),
  });

  const incomplete = data && (!data.privacyControllerName || !data.privacyContactEmail);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacy degli ospiti</CardTitle>
        <CardDescription>
          Sei titolare dei dati che gli ospiti inseriscono nel widget. Questi dati compaiono nell'informativa privacy
          collegata al modulo di prenotazione.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {incomplete && (
          <p className="text-sm rounded-md bg-warning/10 text-foreground border border-warning/40 p-3" data-testid="text-privacy-incomplete">
            Completa almeno titolare ed email: finché mancano, l'informativa usa il nome della struttura e non indica un
            recapito.
          </p>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit((values) => save.mutate(values))} className="space-y-4">
            <FormField
              control={form.control}
              name="privacyControllerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titolare del trattamento</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Agriturismo Rossi di Mario Rossi" data-testid="input-privacy-controller" />
                  </FormControl>
                  <FormDescription>Nome o ragione sociale di chi gestisce la struttura.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="privacyControllerAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Via Roma 1, 53100 Siena, P.IVA 01234567890" data-testid="input-privacy-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="privacyContactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email per le richieste privacy</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="privacy@tuastruttura.it" data-testid="input-privacy-email" />
                  </FormControl>
                  <FormDescription>Gli ospiti la useranno per esercitare i loro diritti. È pubblica.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={save.isPending} data-testid="button-save-privacy">
              Salva
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
