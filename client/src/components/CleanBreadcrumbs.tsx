import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Spinner } from "@/components/ui/spinner";
import { CleanCopyUrl } from "@/components/CleanCopyUrl";

export type CleanBreadcrumbItem = {
  label: string;
  href?: string;
  current?: boolean;
};

export function CleanBreadcrumbs({ items }: { items: CleanBreadcrumbItem[] }) {
  const [location] = useLocation();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  useEffect(() => {
    setLoadingHref(null);
  }, [location]);

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <nav aria-label="Breadcrumb" className="mt-0">
      <ol className="flex flex-wrap items-center gap-1 text-[9px] font-bold uppercase tracking-[.11em] text-[#718075]">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 text-[#a3b0a1]" />}
            {item.href && !item.current ? (
              loadingHref === item.href ? (
                <span aria-live="polite" className="inline-flex items-center gap-1 text-[#876e16]">
                  <Spinner aria-hidden="true" className="size-3" />
                  Loading {item.label}
                </span>
              ) : (
                <Link href={item.href} onClick={() => item.href && setLoadingHref(item.href)} className="hover:text-[#173d2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#876e16] focus-visible:ring-offset-2">
                  {item.label}
                </Link>
              )
            ) : (
              <span aria-current={item.current ? "page" : undefined} className={item.current ? "text-[#173d2a]" : undefined}>
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      </nav>
      <CleanCopyUrl />
    </div>
  );
}
