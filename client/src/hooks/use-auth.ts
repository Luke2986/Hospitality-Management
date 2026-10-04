import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export type AuthUser = { id: string; email: string; fullName: string | null };

export const AUTH_QUERY_KEY = ["/api/auth/me"];

export function useAuth() {
  const { data, isLoading } = useQuery<AuthUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  return { user: data ?? null, isLoading };
}
