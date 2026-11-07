import { useTranslate } from "@refinedev/core";
import { CircleAlert, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** A failed read: says so (instead of looking empty) and offers a retry. */
export function ErrorState({
  title,
  description,
  onRetry,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  className?: string;
}) {
  const translate = useTranslate();
  return (
    <Empty className={cn("border border-dashed", className)} role="alert">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="text-destructive">
          <CircleAlert />
        </EmptyMedia>
        <EmptyTitle>{title ?? translate("common.titles.somethingWentWrong")}</EmptyTitle>
        <EmptyDescription>{description ?? translate("common.descriptions.theDataCouldNotBeLoaded")}</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCw />
            {translate("buttons.retry")}
          </Button>
        </EmptyContent>
      )}
    </Empty>
  );
}

/**
 * Placeholder for a form page while its record loads: a header and a few section cards, so the page
 * doesn't jump from a centred spinner to a long form.
 */
export function FormSkeleton({ sections = 3, header = true }: { sections?: number; header?: boolean }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      {header && <Skeleton className="h-6 w-56" />}
      {Array.from({ length: sections }, (_, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-xl border border-foreground/8 bg-card p-4 shadow-card md:p-5">
          <Skeleton className="h-4 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: i === 0 ? 4 : 2 }, (_, j) => (
              <div key={j} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
