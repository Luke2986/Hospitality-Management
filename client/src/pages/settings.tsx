import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Code2, CheckCircle2 } from "lucide-react";
import type { User, Property } from "@shared/schema";
import { useState } from "react";
import { PrivacySettingsCard } from "@/components/privacy-settings";

export default function Settings() {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });

  const { data: properties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const activeProperties = properties?.filter(p => p.active) || [];

  const generateEmbedCode = (propertyId: string) => {
    const widgetUrl = window.location.origin;
    return `<div data-booking-widget data-property-id="${propertyId}"></div>
<script>
  window.BOOKING_WIDGET_URL = '${widgetUrl}';
</script>
<script src="${widgetUrl}/widget.js" async></script>`;
  };

  const copyToClipboard = async (code: string, propertyId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(propertyId);
      toast({
        title: "✓ Copiato!",
        description: "Il codice è stato copiato negli appunti",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile copiare il codice",
        variant: "destructive",
      });
    }
  };

  const openPreview = (propertyId: string) => {
    window.open(`/widget/${propertyId}`, '_blank');
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Impostazioni</h1>
        <p className="text-muted-foreground">Gestisci il tuo account e widget</p>
      </div>

      <Tabs defaultValue="widget" className="space-y-6">
        <TabsList>
          <TabsTrigger value="widget" data-testid="tab-widget">
            <Code2 className="w-4 h-4 mr-2" />
            Widget WordPress
          </TabsTrigger>
          <TabsTrigger value="account" data-testid="tab-account">
            Account
          </TabsTrigger>
          <TabsTrigger value="privacy" data-testid="tab-privacy">
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="widget" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Widget per il Tuo Sito</CardTitle>
              <CardDescription>
                Integra il sistema di prenotazioni direttamente sul tuo sito WordPress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Instructions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Come Installare su WordPress</h3>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">1</span>
                    <span>Accedi alla tua <strong>bacheca WordPress</strong> (wp-admin)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">2</span>
                    <span>Crea o modifica una pagina dove vuoi mostrare il widget</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">3</span>
                    <span>Aggiungi un blocco <strong>"HTML personalizzato"</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">4</span>
                    <span>Copia e incolla il codice della tua proprietà (sotto)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">5</span>
                    <span><strong>Pubblica</strong> la pagina e il widget apparirà automaticamente!</span>
                  </li>
                </ol>
              </div>

              {/* Widget Codes for Each Property */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Codice Embed per le Tue Proprietà</h3>
                
                {activeProperties.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nessuna proprietà attiva trovata.</p>
                    <p className="text-sm">Crea una proprietà nella sezione "Proprietà" per generare il codice widget.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeProperties.map((property) => {
                      const embedCode = generateEmbedCode(property.id);
                      const isCopied = copiedId === property.id;

                      return (
                        <Card key={property.id}>
                          <CardHeader>
                            <CardTitle className="text-base">{property.name}</CardTitle>
                            <CardDescription>
                              {property.city}, {property.country}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Code Box */}
                            <div className="relative">
                              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                <code>{embedCode}</code>
                              </pre>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                onClick={() => copyToClipboard(embedCode, property.id)}
                                variant={isCopied ? "default" : "outline"}
                                data-testid={`button-copy-${property.id}`}
                              >
                                {isCopied ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Copiato!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copia Codice
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => openPreview(property.id)}
                                variant="secondary"
                                data-testid={`button-preview-${property.id}`}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Anteprima
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Account</CardTitle>
              <CardDescription>I dettagli del tuo profilo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Nome Completo</div>
                <div className="text-base">{user?.fullName || "Non impostato"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Email</div>
                <div className="text-base">{user?.email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Membro dal</div>
                <div className="text-base">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('it-IT') : "Sconosciuto"}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacySettingsCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
