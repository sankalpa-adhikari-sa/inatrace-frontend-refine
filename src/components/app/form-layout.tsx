import { useTranslate } from "@refinedev/core";
import { ChevronDown, ListTree } from "lucide-react";
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type Control, type FieldValues, useFormState } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { INVALID_SELECTOR, scrollBehavior } from "@/lib/form-errors";
import { cn } from "@/lib/utils";

type SectionEntry = { id: string; label: string; el: HTMLElement };

type Registry = { register: (entry: SectionEntry) => () => void };

const FormSectionsContext = createContext<Registry | null>(null);

/** Sections with fewer entries than this don't get a table of contents. */
const MIN_SECTIONS = 4;
/**
 * A section is the current one once its top has scrolled into the upper third of the viewport, so a
 * section filling the screen is highlighted even though its heading is still a little way down.
 */
const activeLine = () => Math.max(140, window.innerHeight / 3);

/**
 * Registers a `Section` with the enclosing `FormLayout` (no-op outside one), so it appears in the
 * table of contents. Called by `Section` when it has an `id`.
 */
export function useFormSection(id: string | undefined, label: string | undefined, ref: RefObject<HTMLElement | null>) {
  const registry = useContext(FormSectionsContext);
  useLayoutEffect(() => {
    if (!registry || !id || !label || !ref.current) return;
    return registry.register({ id, label, el: ref.current });
  }, [registry, id, label, ref]);
}

const byDomOrder = (a: SectionEntry, b: SectionEntry) =>
  a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;

function scrollToSection(entry: SectionEntry) {
  entry.el.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  entry.el.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  history.replaceState(history.state, "", `#${entry.id}`);
}

/** The section the reader is in: the last one whose top has scrolled past the sticky chrome. */
function useActiveSection(entries: SectionEntry[]) {
  const [active, setActive] = useState<string>();
  useEffect(() => {
    if (!entries.length) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = entries[0];
      if (atBottom) current = entries[entries.length - 1];
      else {
        const line = activeLine();
        for (const e of entries) if (e.el.getBoundingClientRect().top <= line) current = e;
      }
      setActive(current.id);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [entries]);
  return [active, setActive] as const;
}

/** Ids of sections that currently contain an invalid field; re-read whenever the form's errors change. */
function useSectionsWithErrors<T extends FieldValues>(entries: SectionEntry[], control: Control<T>) {
  const { errors, submitCount } = useFormState({ control });
  const [withErrors, setWithErrors] = useState<Set<string>>(new Set());
  useEffect(() => {
    // Fields render their error state in the same commit; read the DOM once it has been painted.
    const frame = requestAnimationFrame(() => {
      const next = new Set(entries.filter((e) => e.el.querySelector(INVALID_SELECTOR)).map((e) => e.id));
      setWithErrors((prev) => (prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next));
    });
    return () => cancelAnimationFrame(frame);
  }, [entries, errors, submitCount]);
  return withErrors;
}

/** Stops Enter in a one-line input from submitting the whole (long) form. */
function preventImplicitSubmit(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "Enter" || e.defaultPrevented) return;
  const target = e.target as HTMLElement;
  if (target instanceof HTMLInputElement && !["submit", "button", "checkbox", "radio", "file"].includes(target.type)) {
    e.preventDefault();
  }
}

/**
 * Layout for long forms: the content column plus a table of contents of its `Section`s (those given an
 * `id`). On wide screens the contents are a sticky rail beside the form that follows the scroll and marks
 * sections with errors; on narrower ones they are a sticky "Jump to" menu above the form.
 * Place it inside the `<form>`; put `<FormActions sticky control={control}>` last among its children.
 */
export function FormLayout<T extends FieldValues>({
  control,
  children,
  className,
}: {
  control: Control<T>;
  children: ReactNode;
  className?: string;
}) {
  const [entries, setEntries] = useState<SectionEntry[]>([]);
  const registry = useMemo<Registry>(
    () => ({
      register: (entry) => {
        setEntries((prev) => [...prev.filter((e) => e.id !== entry.id), entry].sort(byDomOrder));
        return () => setEntries((prev) => prev.filter((e) => e !== entry));
      },
    }),
    []
  );
  const showToc = entries.length >= MIN_SECTIONS;
  const [active, setActive] = useActiveSection(entries);
  const withErrors = useSectionsWithErrors(entries, control);

  // Deep link: /…/edit#certification scrolls to that section once it has registered.
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || !location.hash) return;
    const entry = entries.find((e) => `#${e.id}` === location.hash);
    if (entry) {
      jumped.current = true;
      entry.el.scrollIntoView({ block: "start" });
    }
  }, [entries]);

  const jump = useCallback(
    (entry: SectionEntry) => {
      setActive(entry.id);
      scrollToSection(entry);
    },
    [setActive]
  );

  return (
    <FormSectionsContext.Provider value={registry}>
      <div
        className={cn("grid gap-6 xl:grid-cols-[minmax(0,64rem)_12.5rem]", className)}
        // Only on long forms: on a short one, Enter to save is expected and an accidental submit is cheap.
        onKeyDown={showToc ? preventImplicitSubmit : undefined}
      >
        {/* A size container, so section grids inside can respond to the column's width (`@3xl:…`), not the window's. */}
        <div className="@container flex min-w-0 flex-col gap-6">
          {showToc && <JumpToMenu entries={entries} active={active} withErrors={withErrors} onJump={jump} />}
          {children}
        </div>
        {showToc && (
          <aside className="hidden xl:block">
            <TocRail entries={entries} active={active} withErrors={withErrors} onJump={jump} />
          </aside>
        )}
      </div>
    </FormSectionsContext.Provider>
  );
}

type TocProps = {
  entries: SectionEntry[];
  active: string | undefined;
  withErrors: Set<string>;
  onJump: (entry: SectionEntry) => void;
};

function ErrorDot({ label }: { label: string }) {
  return <span role="img" aria-label={label} className="size-1.5 shrink-0 rounded-full bg-destructive" />;
}

function TocRail({ entries, active, withErrors, onJump }: TocProps) {
  const translate = useTranslate();
  const hasErrors = translate("common.texts.hasErrors");
  return (
    <nav aria-label={translate("common.titles.onThisPage")} className="sticky top-16 flex flex-col gap-2">
      <p className="px-3 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {translate("common.titles.onThisPage")}
      </p>
      <ul className="flex flex-col border-l">
        {entries.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              title={e.label}
              aria-current={active === e.id ? "location" : undefined}
              onClick={(ev) => {
                ev.preventDefault();
                onJump(e);
              }}
              className={cn(
                "-ml-px flex items-center gap-2 border-l-2 py-1.5 pr-2 pl-3 text-xs transition-colors",
                active === e.id
                  ? "border-secondary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              )}
            >
              <span className="min-w-0 flex-1 truncate">{e.label}</span>
              {withErrors.has(e.id) && <ErrorDot label={hasErrors} />}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function JumpToMenu({ entries, active, withErrors, onJump }: TocProps) {
  const translate = useTranslate();
  const hasErrors = translate("common.texts.hasErrors");
  const current = entries.find((e) => e.id === active) ?? entries[0];
  return (
    <div className="sticky top-14 z-10 xl:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2 bg-card/95 shadow-card backdrop-blur sm:w-auto sm:max-w-full"
            />
          }
        >
          <ListTree className="text-muted-foreground" />
          <span className="text-muted-foreground">{translate("common.placeholders.jumpTo")}</span>
          <span className="min-w-0 truncate font-medium">{current?.label}</span>
          {withErrors.size > 0 && <ErrorDot label={hasErrors} />}
          <ChevronDown className="ml-auto opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          {entries.map((e) => (
            <DropdownMenuItem key={e.id} onClick={() => onJump(e)} className={cn(active === e.id && "font-medium")}>
              <span className="min-w-0 flex-1 truncate">{e.label}</span>
              {withErrors.has(e.id) && <ErrorDot label={hasErrors} />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
