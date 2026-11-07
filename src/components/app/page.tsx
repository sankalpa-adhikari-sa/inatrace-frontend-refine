import { ArrowLeft, ChevronLeft, Info } from "lucide-react";
import { Fragment, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { type Control, type FieldValues, useFormState } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { useGoBack } from "@/hooks/use-go-back";
import { useHasUnsavedChanges } from "@/hooks/use-warn-when-dirty";
import { env } from "@/lib/env";
import { countErrors, revealFirstError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { useTranslate } from "@refinedev/core";
import { useFormSection } from "./form-layout";

/** A step in a page's breadcrumb trail: the pages above it, not the page itself (that's the title). */
export type Crumb = { label: ReactNode; to?: string };

let pageTitle: string | null = null;

/**
 * The browser tab title: "<page title> · INATrace" while a page with a `PageHeader` is shown, else the app
 * name. Also the `DocumentTitleHandler` handler (App.tsx), which re-runs on its own (e.g. when translations
 * load) and would otherwise overwrite the page's title.
 */
export const documentTitle = () => (pageTitle ? `${pageTitle} · ${env.appName}` : env.appName);

/** Sets the browser tab title to "<title> · INATrace" while the page is shown. */
export function useDocumentTitle(title: ReactNode) {
  useEffect(() => {
    if (typeof title !== "string" || !title) return;
    const own = title;
    pageTitle = own;
    document.title = documentTitle();
    return () => {
      if (pageTitle === own) pageTitle = null;
      document.title = documentTitle();
    };
  }, [title]);
}

export function PageHeader({
  title,
  description,
  actions,
  back,
  breadcrumbs,
  badge,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /**
   * Show a back button; a string navigates there, `true` goes back in history (or /home if opened directly).
   * Not shown with `breadcrumbs`, whose last step is the way back.
   */
  back?: string | boolean;
  /** Pages above this one, outermost first. On phones only the nearest one is shown, as a back link. */
  breadcrumbs?: Crumb[];
  /** Shown next to the title, e.g. a status badge. */
  badge?: ReactNode;
}) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const goBack = useGoBack();
  useDocumentTitle(title);
  const parent = breadcrumbs?.findLast((c) => c.to);
  const showBack = back && !breadcrumbs?.length;
  return (
    <div className="flex flex-col gap-1.5">
      {!!breadcrumbs?.length && (
        <>
          <Breadcrumb className="hidden sm:block">
            <BreadcrumbList className="text-xs">
              {breadcrumbs.map((c, i) => (
                <Fragment key={i}>
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem className="max-w-56 min-w-0">
                    {c.to ? (
                      <BreadcrumbLink render={<Link to={c.to} />} className="truncate">
                        {c.label}
                      </BreadcrumbLink>
                    ) : (
                      <span className="truncate">{c.label}</span>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
          {parent?.to && (
            <Link
              to={parent.to}
              className="inline-flex max-w-full items-center gap-0.5 self-start text-xs text-muted-foreground hover:text-foreground sm:hidden"
            >
              <ChevronLeft className="size-3.5 shrink-0" />
              <span className="truncate">{parent.label}</span>
            </Link>
          )}
        </>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={translate("buttons.back")}
              onClick={() => (typeof back === "string" ? navigate(back) : goBack())}
            >
              <ArrowLeft />
            </Button>
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-xl leading-tight font-semibold tracking-tight text-foreground">{title}</h1>
              {badge}
            </div>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export type PageTab = {
  label: string;
  to: string;
  disabled?: boolean;
  /** Why the tab is disabled; shown on hover and on tap. */
  disabledReason?: string;
  exact?: boolean;
  onboarding?: string;
  /** A count shown after the label (e.g. open orders). */
  count?: number;
};

/** Whether a scroll container has more content to its left / right, for edge fades. */
function useOverflowEdges(ref: React.RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState({ start: false, end: false });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      setEdges({ start: el.scrollLeft > 1, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [ref]);
  return edges;
}

/** Route-driven tabs under a page header; they scroll sideways (with edge fades) when they don't fit. */
export function PageTabs({ tabs }: { tabs: PageTab[] }) {
  const { pathname } = useLocation();
  const nav = useRef<HTMLElement>(null);
  const edges = useOverflowEdges(nav);
  const active = (tab: PageTab) =>
    tab.exact ? pathname === tab.to : pathname === tab.to || pathname.startsWith(`${tab.to}/`);

  // On a narrow screen the current tab may be scrolled out of view; bring it in.
  useLayoutEffect(() => {
    nav.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);

  const fade =
    edges.start && edges.end
      ? "[mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]"
      : edges.end
        ? "[mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]"
        : edges.start
          ? "[mask-image:linear-gradient(to_right,transparent,black_2rem)]"
          : "";

  const label = (tab: PageTab) => (
    <>
      {tab.label}
      {tab.count != null && (
        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-px text-[0.6875rem] text-muted-foreground tabular-nums">
          {tab.count}
        </span>
      )}
    </>
  );

  return (
    <nav ref={nav} className={cn("-mt-2 flex gap-1 overflow-x-auto overflow-y-hidden border-b [scrollbar-width:none]", fade)}>
      {tabs.map((tab) =>
        tab.disabled ? (
          tab.disabledReason ? (
            <Popover key={tab.to}>
              <PopoverTrigger
                openOnHover
                delay={150}
                render={
                  <button
                    type="button"
                    aria-disabled
                    className="inline-flex cursor-not-allowed items-center gap-1 px-3 py-2 text-sm whitespace-nowrap text-muted-foreground/60"
                  />
                }
              >
                {label(tab)}
                <Info className="size-3.5" aria-hidden />
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-64 text-xs">
                {tab.disabledReason}
              </PopoverContent>
            </Popover>
          ) : (
            <span
              key={tab.to}
              aria-disabled
              className="cursor-not-allowed px-3 py-2 text-sm whitespace-nowrap text-muted-foreground/50"
            >
              {label(tab)}
            </span>
          )
        ) : (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={active(tab) ? "page" : undefined}
            data-onboarding={tab.onboarding}
            className={cn(
              "-mb-px border-b-3 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active(tab)
                ? "border-secondary text-secondary-strong"
                : "border-transparent text-foreground hover:text-secondary-strong"
            )}
          >
            {label(tab)}
          </Link>
        )
      )}
    </nav>
  );
}

export function Section({
  id,
  title,
  navLabel,
  description,
  actions,
  children,
  className,
  onboarding,
  plain,
  required,
}: {
  /**
   * Anchor id (`#id`). Inside a `FormLayout`, a section with an id is listed in the form's table of
   * contents under `navLabel` (or `title` when that is a string).
   */
  id?: string;
  title?: ReactNode;
  /** Shorter label for the table of contents. */
  navLabel?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Self-onboarding target name for the title (see components/app/onboarding). */
  onboarding?: string;
  /**
   * No card frame: for sections whose content is already framed (a table, a grid of cards,
   * a bordered list), so it isn't a card inside a card. Form sections keep the card.
   */
  plain?: boolean;
  /** Marks the title as required, for a section that is itself one unlabelled field (e.g. a list). */
  required?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useFormSection(id, navLabel ?? (typeof title === "string" ? title : undefined), ref);
  const titleId = id && title ? `${id}-title` : undefined;
  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={titleId}
      className={cn(
        "flex min-w-0 scroll-mt-28 flex-col gap-4",
        !plain && "rounded-xl border border-foreground/8 bg-card p-4 shadow-card md:p-5",
        className
      )}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            {title && (
              <h2
                id={titleId}
                // Focus target when jumping here from the table of contents.
                tabIndex={id ? -1 : undefined}
                className="font-heading text-base leading-tight font-semibold text-foreground outline-none"
                data-onboarding={onboarding}
              >
                {title}
                {required && (
                  <span aria-hidden className="ml-0.5 text-destructive">
                    *
                  </span>
                )}
              </h2>
            )}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Spinner className="size-6" />
    </div>
  );
}

/**
 * Cancel / Save row at the end of a form. `sticky` keeps it at the bottom of the viewport while the form
 * is on screen (use it on long forms); with `control` it also shows whether there are unsaved changes and,
 * after a failed submit, how many fields need fixing with a link to the first one.
 */
export function FormActions<T extends FieldValues>({
  children,
  sticky,
  control,
  dirty,
}: {
  children: ReactNode;
  sticky?: boolean;
  control?: Control<T>;
  /** Overrides the form's own dirty state, for pages that also keep unsaved state outside the form. */
  dirty?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-end gap-2",
        sticky &&
          "sticky bottom-3 z-10 rounded-xl border border-foreground/8 bg-card/95 px-4 py-3 shadow-[0_-2px_16px_0_rgb(37_38_94/0.08)] backdrop-blur"
      )}
    >
      {control && <FormStatus control={control} dirty={dirty} />}
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
  );
}

function FormStatus<T extends FieldValues>({ control, dirty }: { control: Control<T>; dirty?: boolean }) {
  const translate = useTranslate();
  const { errors, submitCount } = useFormState({ control });
  const formDirty = useHasUnsavedChanges(control);
  const isDirty = dirty ?? formDirty;
  const errorCount = submitCount > 0 ? countErrors(errors) : 0;
  if (errorCount > 0) {
    return (
      <p role="status" className="flex items-center gap-2 text-xs text-destructive">
        <span aria-hidden className="size-2 rounded-full bg-destructive" />
        {translate("common.texts.fieldsToFix", { count: errorCount })}
        <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => revealFirstError()}>
          {translate("buttons.goToFirstError")}
        </Button>
      </p>
    );
  }
  if (isDirty) {
    return (
      <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden className="size-2 rounded-full bg-warning" />
        {translate("common.texts.unsavedChanges")}
      </p>
    );
  }
  return null;
}
