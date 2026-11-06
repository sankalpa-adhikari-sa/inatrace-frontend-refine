import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useGoBack } from "@/hooks/use-go-back";
import { cn } from "@/lib/utils";
import { useTranslate } from "@refinedev/core";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Show a back button; a string navigates there, `true` goes back in history (or /home if opened directly). */
  back?: string | boolean;
}) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const goBack = useGoBack();
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        {back && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={translate("buttons.back")}
            onClick={() => (typeof back === "string" ? navigate(back) : goBack())}
          >
            <ArrowLeft />
          </Button>
        )}
        <div className="flex flex-col gap-0.5">
          <h1 className="font-heading text-xl leading-tight font-semibold tracking-tight text-secondary">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export type PageTab = {
  label: string;
  to: string;
  disabled?: boolean;
  /** Shown on hover while the tab is disabled. */
  disabledReason?: string;
  exact?: boolean;
  onboarding?: string;
};

export function PageTabs({ tabs }: { tabs: PageTab[] }) {
  const { pathname } = useLocation();
  const active = (tab: PageTab) =>
    tab.exact ? pathname === tab.to : pathname === tab.to || pathname.startsWith(`${tab.to}/`);

  return (
    <nav className="-mt-2 flex gap-1 overflow-x-auto overflow-y-hidden border-b [scrollbar-width:none]">
      {tabs.map((tab) =>
        tab.disabled ? (
          <span
            key={tab.to}
            title={tab.disabledReason}
            className="cursor-not-allowed px-3 py-2 text-sm whitespace-nowrap text-muted-foreground/50"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.to}
            to={tab.to}
            data-onboarding={tab.onboarding}
            className={cn(
              "-mb-px border-b-3 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active(tab)
                ? "border-secondary text-secondary-strong"
                : "border-transparent text-foreground hover:text-secondary-strong"
            )}
          >
            {tab.label}
          </Link>
        )
      )}
    </nav>
  );
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
  onboarding,
  plain,
}: {
  title?: ReactNode;
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
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-4",
        !plain && "rounded-xl border border-foreground/8 bg-card p-4 shadow-card md:p-5",
        className
      )}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            {title && (
              <h2 className="font-heading text-base leading-tight font-semibold text-heading" data-onboarding={onboarding}>
                {title}
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

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2">{children}</div>;
}
