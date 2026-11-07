import { useTranslate } from "@refinedev/core";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * One item of a repeated group in a form (an output, a proof, …): a framed block headed by its name and
 * a remove button, so items are told apart and removing one is clearly tied to it.
 */
export function RepeaterItem({
  title,
  onRemove,
  children,
  className,
}: {
  title: ReactNode;
  /** Omitted when the item can't be removed (e.g. the only one). */
  onRemove?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const translate = useTranslate();
  return (
    <div className={cn("flex flex-col gap-4 rounded-lg border border-foreground/10 bg-muted/20 p-3 md:p-4", className)}>
      <div className="-mt-1 flex min-h-7 items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
        {onRemove && (
          <Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={onRemove}>
            <Trash2 />
            {translate("buttons.remove")}
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}
