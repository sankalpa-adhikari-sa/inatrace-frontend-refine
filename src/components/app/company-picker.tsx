import { useLogout, useTranslate } from "@refinedev/core";
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { ApiCompanyGet } from "@/client/types.gen";
import { CompanyAvatar } from "./company-avatar";
import { useIdentity } from "@/hooks/use-session";
import { useCompanyStore } from "@/stores/company";
import { useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";

const PickerContext = createContext<() => void>(() => {});

export function useCompanyPicker() {
  return useContext(PickerContext);
}


export function CompanyGate({ children }: PropsWithChildren) {
  const { user } = useIdentity();
  const { selectedCompanyId, select, clear } = useCompanyStore();
  const [open, setOpen] = useState(false);

  const companyIds = user?.companyIds ?? [];

  useEffect(() => {
    if (!user) return;
    if (selectedCompanyId != null && !companyIds.includes(selectedCompanyId)) {
      clear();
      return;
    }
    if (selectedCompanyId == null) {
      if (companyIds.length === 1) select(companyIds[0]);
      else setOpen(true);
    }
    // companyIds is derived from user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedCompanyId]);

  return (
    <PickerContext.Provider value={() => setOpen(true)}>
      {children}
      <CompanyPickerDialog
        open={open}
        // Selection is mandatory when nothing is selected yet.
        dismissible={selectedCompanyId != null}
        onClose={() => setOpen(false)}
      />
    </PickerContext.Provider>
  );
}

/** Headquarters as "street · zip city · state, country" (empty parts left out). */
function addressOf(company?: ApiCompanyGet) {
  const hq = company?.headquarters;
  if (!hq) return "";
  const city = [hq.zip, hq.city || hq.village || hq.hondurasMunicipality].filter(Boolean).join(" ");
  return [hq.address, city, [hq.state, hq.country?.name].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
}

/** Up to two initials, e.g. "Kigali Coffee Coop" → "KC". */
const initialsOf = (name?: string) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase())
    .join("") || "?";

/** Case-insensitive "contains" match on the company name (cmdk's default is a fuzzy score). */
const byName = (_value: string, search: string, keywords?: string[]) =>
  keywords?.[0]?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) ? 1 : 0;

/** `value`, once it has stopped changing for `ms` (arrow keys don't fetch every row they pass). */
function useSettled<T>(value: T, ms = 200) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

/**
 * Searchable company list. The list endpoint returns names only, so rows show initials and
 * the highlighted company's profile (logo, headquarters) is loaded on its own for the footer.
 * Arrow keys or a click choose a company; Enter or the Select button confirms it.
 */
function CompanyPickerDialog({
  open,
  dismissible,
  onClose,
}: {
  open: boolean;
  dismissible: boolean;
  onClose: () => void;
}) {
  const translate = useTranslate();
  const { selectedCompanyId, select } = useCompanyStore();
  const { mutate: logout } = useLogout();
  const [choice, setChoice] = useState<number | null>(selectedCompanyId);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setChoice(selectedCompanyId);
    setSearch("");
  }, [open, selectedCompanyId]);

  const { data, isLoading } = useApi(
    ep.listCompanies,
    { query: { requestType: "FETCH", status: "ACTIVE", sortBy: "name", sort: "ASC", limit: 1000 } },
    { enabled: open, select: (r) => r?.items ?? [] }
  );
  const previewId = useSettled(choice);
  const { data: detail, isError: previewFailed } = useApi(
    ep.getCompany,
    { path: { id: previewId ?? 0 } },
    { enabled: open && previewId != null, staleTime: 5 * 60_000 }
  );

  const companies = data ?? [];
  const hasCompanies = isLoading || companies.length > 0;
  const chosen = companies.find((c) => c.id === choice);
  // The profile on screen belongs to the highlighted company (not one passed on the way).
  const preview = detail?.id === choice ? detail : undefined;

  const confirm = (id: number | null = choice) => {
    if (id == null) return;
    select(id);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismissible && onClose()}>
      <DialogContent showCloseButton={dismissible} className="gap-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{translate("common.titles.selectCompany")}</DialogTitle>
          <DialogDescription>
            {hasCompanies
              ? translate("common.descriptions.chooseTheCompanyYouWant")
              : translate("common.descriptions.currentlyYouHaveNoCompanies")}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : (
          companies.length > 0 && (
            <Command
              filter={byName}
              className="bg-transparent p-0"
              // The highlighted row is the choice (arrow keys move it); hovering doesn't change it.
              value={choice != null ? String(choice) : ""}
              onValueChange={(v) => setChoice(v ? Number(v) : null)}
              disablePointerSelection
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && confirm()}
            >
              <CommandInput
                autoFocus
                value={search}
                onValueChange={setSearch}
                placeholder={translate("common.placeholders.searchCompanies", { companiesCount: companies.length })}
              />
              <CommandList className="mt-2 max-h-72">
                <CommandEmpty className="py-10 text-muted-foreground">
                  {translate("common.texts.noCompaniesMatch", { search })}
                </CommandEmpty>
                <CommandGroup className="p-0">
                  {companies.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={String(c.id)}
                      keywords={[c.name ?? ""]}
                      data-checked={choice === c.id}
                      onSelect={() => setChoice(c.id ?? null)}
                      className="gap-3 py-1.5 data-[checked=true]:bg-primary/10 data-[checked=true]:text-foreground"
                    >
                      <span
                        aria-hidden
                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[0.625rem] font-semibold text-muted-foreground group-data-[checked=true]/command-item:bg-primary group-data-[checked=true]/command-item:text-primary-foreground"
                      >
                        {initialsOf(c.name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      {c.id === selectedCompanyId && (
                        <span className="shrink-0 text-[0.625rem] text-muted-foreground">{translate("common.texts.current")}</span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )
        )}
        <DialogFooter className="items-center gap-3 rounded-lg bg-muted/50 p-3 sm:justify-between">
          {hasCompanies ? (
            <>
              <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
                {chosen ? (
                  <>
                    <CompanyAvatar company={preview} className="size-10 border-0" />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">{chosen.name}</span>
                      {preview || (previewFailed && previewId === choice) ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {addressOf(preview) || translate("common.texts.noAddress")}
                        </span>
                      ) : (
                        <span className="mt-1 h-2.5 w-44 animate-pulse rounded bg-muted" />
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">{translate("common.texts.noCompanySelected")}</span>
                )}
              </div>
              <Button className="w-full sm:w-auto" disabled={choice == null} onClick={() => confirm()}>
                {translate("buttons.select")}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => logout()}>
              {translate("buttons.logOut")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
