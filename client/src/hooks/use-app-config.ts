import { useQuery } from "@tanstack/react-query";

export type AppConfig = { demo: boolean };

export function useAppConfig(): AppConfig {
  const { data } = useQuery<AppConfig>({ queryKey: ["/api/config"] });
  return data ?? { demo: false };
}
