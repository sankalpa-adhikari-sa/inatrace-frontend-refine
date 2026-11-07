import { useTranslate } from "@refinedev/core";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { INVALID_SELECTOR } from "@/lib/form-errors";
import { cn } from "@/lib/utils";

/**
 * One tab per language for translated fields (facility name, processing action, settings codebooks).
 * All panels stay mounted so every language is validated and submitted; a tab whose panel holds an
 * invalid field gets an error dot, and "go to first error" switches to it (lib/form-errors).
 */
export function TranslationTabs<L extends string>({
  languages,
  children,
  className,
  panelClassName,
}: {
  languages: readonly L[];
  children: (language: L, index: number) => ReactNode;
  className?: string;
  panelClassName?: string;
}) {
  const translate = useTranslate();
  const panels = useRef<HTMLDivElement>(null);
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());

  // Field error state is rendered as attributes; watch for it instead of threading the form's errors in.
  useEffect(() => {
    const root = panels.current;
    if (!root) return;
    const update = () => {
      const next = new Set(
        [...root.querySelectorAll<HTMLElement>("[data-language]")]
          .filter((p) => p.querySelector(INVALID_SELECTOR))
          .map((p) => p.dataset.language!)
      );
      setInvalid((prev) => (prev.size === next.size && [...next].every((l) => prev.has(l)) ? prev : next));
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-invalid", "aria-invalid"] });
    return () => observer.disconnect();
  }, []);

  const hasErrors = translate("common.texts.hasErrors");
  return (
    <Tabs defaultValue={languages[0]} className={cn("flex-col", className)}>
      <TabsList variant="line" className="h-auto w-full justify-start border-b p-0">
        {languages.map((l) => (
          <TabsTrigger
            key={l}
            value={l}
            className="h-8 flex-none px-3 after:bottom-[-1px] after:bg-secondary data-active:text-secondary-strong"
          >
            {l}
            {invalid.has(l) && (
              <span role="img" aria-label={hasErrors} className="size-1.5 rounded-full bg-destructive" />
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      <div ref={panels} className="contents">
        {languages.map((l, i) => (
          <TabsContent key={l} value={l} keepMounted data-language={l} className={cn("flex flex-col gap-3 pt-2", panelClassName)}>
            {children(l, i)}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  );
}
