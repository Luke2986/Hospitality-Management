import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PAGE_SIZE = 25;

export type PageResult<T> = { items: T[]; total: number };

export async function fetchPage<T>(path: string, params: URLSearchParams, page: number): Promise<PageResult<T>> {
  const query = new URLSearchParams(params);
  query.set("limit", String(PAGE_SIZE));
  query.set("offset", String(page * PAGE_SIZE));
  const res = await apiRequest("GET", `${path}?${query}`);
  return { items: await res.json(), total: Number(res.headers.get("X-Total-Count") ?? 0) };
}

export function PaginationControls({
  page,
  total,
  onPageChange,
}: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.ceil(total / PAGE_SIZE);
  if (pageCount <= 1) return null;
  const first = page * PAGE_SIZE + 1;
  const last = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="flex items-center justify-between gap-4" data-testid="pagination">
      <p className="text-sm text-muted-foreground">
        {first}–{last} di {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          data-testid="button-page-prev"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Precedente
        </Button>
        <span className="text-sm text-muted-foreground">
          Pagina {page + 1} di {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page + 1 >= pageCount}
          data-testid="button-page-next"
        >
          Successiva
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
