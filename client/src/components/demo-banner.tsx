import { useAppConfig } from "@/hooks/use-app-config";

export function DemoBanner() {
  const { demo } = useAppConfig();
  if (!demo) return null;
  return (
    <div className="bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 text-sm text-center px-4 py-2" data-testid="demo-banner">
      Demo con dati di esempio: prova pure tutto, l'account demo e le modifiche vengono cancellati dopo 24 ore.
    </div>
  );
}
