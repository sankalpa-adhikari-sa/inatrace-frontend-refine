import { useNotification, useTranslate } from "@refinedev/core";
import { Building2, ChevronRight, FileText, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useParams } from "react-router";
import type { ApiProduct, ApiProductCompany } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { SearchInput } from "@/components/app/controls";
import { TextField } from "@/components/app/form-fields";
import { FormActions, PageLoader, Section } from "@/components/app/page";
import { UploadField } from "@/components/app/upload-field";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { useIdentity, useSelectedCompany } from "@/hooks/use-session";
import { ep } from "@/lib/endpoints";
import { cn } from "@/lib/utils";
import { call, useApi, useApiMutation } from "@/lib/http";
import { isAdmin } from "@/providers/auth";
import { ProductTabs } from "./tabs";
import { t } from "@/lib/i18n";

type StakeholderType = NonNullable<ApiProductCompany["type"]>;


const GROUPS: { type: StakeholderType; title: string; singular: string }[] = [
  { type: "OWNER", get title() { return t("products.titles.productAdmins"); }, get singular() { return t("products.fields.productAdmin"); } },
  {
    type: "PRODUCER",
    get title() { return t("products.titles.producers"); },
    get singular() { return t("products.fields.producer"); },
  },
  { type: "PROCESSOR", get title() { return t("products.titles.processors"); }, get singular() { return t("products.fields.processor"); } },
  { type: "BUYER", get title() { return t("products.titles.buyers"); }, get singular() { return t("products.fields.buyer"); } },
  { type: "IMPORTER", get title() { return t("products.titles.importers"); }, get singular() { return t("products.fields.importer"); } },
  { type: "EXPORTER", get title() { return t("products.titles.exporters"); }, get singular() { return t("products.fields.exporter"); } },
  { type: "ASSOCIATION", get title() { return t("products.titles.associations"); }, get singular() { return t("products.fields.association"); } },
  { type: "TRADER", get title() { return t("products.titles.traders"); }, get singular() { return t("products.fields.trader"); } },
];

/** One framed list; rows are divided rather than boxed, so there's no card inside a card. */
const LIST = "divide-y overflow-hidden rounded-lg border bg-card";

/** `/product-labels/:id/stakeholders` (ProductLabelStakeholdersComponent, value chain tab) */
export function ProductStakeholders() {
  const productId = Number(useParams().id);
  const { data: product, refetch } = useApi(ep.getProduct, { path: { id: productId } });
  if (!product) return <PageLoader />;
  return (
    <>
      <ProductTabs productId={productId} />
      <Stakeholders product={product} onChanged={refetch} />
      <DataSharingAgreements key={JSON.stringify(product.dataSharingAgreements)} product={product} onSaved={refetch} />
    </>
  );
}

type Group = (typeof GROUPS)[number];

/** Chips shown inline per role (a few lines at most); the rest are behind "+N more". */
const MAX_CHIPS = 12;
/** Narrow screens stack chips one per line, so fewer are shown there. */
const MOBILE_CHIPS = 4;

const byName = (a: ApiProductCompany, b: ApiProductCompany) =>
  // Numeric-aware, so "Co-op 9" sorts before "Co-op 19".
  (a.company?.name ?? "").localeCompare(b.company?.name ?? "", undefined, { numeric: true, sensitivity: "base" });

function Stakeholders({ product, onChanged }: { product: ApiProduct; onChanged: () => void }) {
  const translate = useTranslate();
  const { user } = useIdentity();
  const confirm = useConfirm();
  // Only system and regional admins can change the stakeholders.
  const editable = isAdmin(user);
  const [adding, setAdding] = useState<Group | null>(null);
  const [managing, setManaging] = useState<Group | null>(null);
  const companies = product.associatedCompanies ?? [];
  const owners = companies.filter((c) => c.type === "OWNER");
  const membersOf = (type: StakeholderType) => companies.filter((c) => c.type === type && c.company).sort(byName);

  const update = useApiMutation({
    mutationFn: (associatedCompanies: ApiProductCompany[]) =>
      call(ep.updateProduct, { body: { ...product, associatedCompanies } }),
    onSuccess: onChanged,
  });

  async function startAdding(group: Group) {
    if (group.type !== "OWNER" && owners.length === 0) {
      await confirm({
        title: translate("products.titles.missingOwner"),
        description: translate("products.descriptions.pleaseAddAnOwnerFirst"),
        confirmLabel: translate("buttons.ok"),
        hideCancel: true,
      });
      return;
    }
    setAdding(group);
  }

  async function remove(pc: ApiProductCompany) {
    if (pc.type === "OWNER" && owners.length <= 1) {
      await confirm({
        title: translate("products.titles.cannotRemove"),
        description: translate("products.descriptions.theProductMustHaveAt"),
        confirmLabel: translate("buttons.ok"),
        hideCancel: true,
      });
      return;
    }
    if (
      !(await confirm({
        description: translate("products.descriptions.areYouSureYouWant", { name: pc.company?.name }),
        destructive: true,
        confirmLabel: translate("buttons.remove"),
      }))
    )
      return;
    update.mutate(companies.filter((c) => c !== pc));
  }

  return (
    <>
      <Section
        plain
        title={translate("products.titles.stakeholders")}
        description={translate("products.descriptions.companiesInvolvedInThisProducts")}
      >
        <ul className={LIST}>
          {GROUPS.map((g) => {
            const members = membersOf(g.type);
            const hidden = members.length - MAX_CHIPS;
            return (
              <li
                key={g.type}
                className="grid min-h-13 grid-cols-[1fr_auto] items-start gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[11rem_1fr_auto]"
              >
                <span className="text-sm leading-7 font-medium">{g.title}</span>
                <div className="col-span-2 row-start-2 flex min-h-7 min-w-0 flex-wrap items-center gap-1.5 md:col-span-1 md:row-start-auto">
                  {members.length === 0 ? (
                    <span className="text-xs leading-7 text-muted-foreground">
                      {translate("products.texts.none")}
                    </span>
                  ) : (
                    members.slice(0, MAX_CHIPS).map((pc, i) => (
                      <CompanyChip
                        key={`${pc.type}-${pc.company!.id}`}
                        className={i >= MOBILE_CHIPS ? "hidden md:inline-flex" : undefined}
                        pc={pc}
                        onRemove={editable ? () => remove(pc) : undefined}
                        disabled={update.isPending}
                      />
                    ))
                  )}
                  {/* On narrow screens the link follows the chips; on desktop it sits bottom-right. */}
                  {members.length > MOBILE_CHIPS && (
                    <ViewAll count={members.length} className="md:hidden" onClick={() => setManaging(g)} />
                  )}
                </div>
                {/* Actions column: Add at the top, View all at the bottom, both clear of the chips. */}
                <div className="col-start-2 row-start-1 flex flex-col items-end justify-between gap-2 self-stretch md:col-start-3">
                  {editable && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-0.5 text-muted-foreground"
                      disabled={update.isPending}
                      onClick={() => startAdding(g)}
                      aria-label={translate("products.buttons.add2", { singular: g.singular })}
                    >
                      <Plus />
                      {translate("products.buttons.add")}
                    </Button>
                  )}
                  {hidden > 0 && (
                    <ViewAll count={members.length} className="hidden md:inline-flex" onClick={() => setManaging(g)} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Section>
      {managing && (
        <ManageSheet
          group={managing}
          members={membersOf(managing.type)}
          busy={update.isPending}
          onRemove={editable ? remove : undefined}
          onAdd={editable ? () => startAdding(managing) : undefined}
          onClose={() => setManaging(null)}
        />
      )}
      {adding && (
        <AddCompaniesDialog
          group={adding}
          existing={new Set(membersOf(adding.type).map((c) => c.company!.id!))}
          onClose={() => setAdding(null)}
          onAdd={(ids) => {
            // One request for the whole selection.
            update.mutate([...companies, ...ids.map((id) => ({ company: { id }, type: adding.type }))]);
            setAdding(null);
          }}
        />
      )}
    </>
  );
}

/** Opens the full list; styled as a link, so it reads as an action rather than a label. */
function ViewAll({ count, className, onClick }: { count: number; className?: string; onClick: () => void }) {
  const translate = useTranslate();
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-xs font-medium whitespace-nowrap text-primary-strong underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
      onClick={onClick}
    >
      {translate("products.buttons.viewAll", { count })}
      <ChevronRight className="size-3.5" />
    </button>
  );
}

function CompanyChip({
  pc,
  onRemove,
  disabled,
  className,
}: {
  pc: ApiProductCompany;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const translate = useTranslate();
  return (
    <span
      className={cn(
        "inline-flex h-7 max-w-60 items-center gap-1.5 rounded-md border bg-muted/40 pr-1 pl-2 text-xs",
        className
      )}
    >
      <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate" title={pc.company!.name}>
        {pc.company!.name}
      </span>
      {onRemove ? (
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground"
          disabled={disabled}
          aria-label={translate("products.buttons.remove", { name: pc.company!.name })}
          onClick={onRemove}
        >
          <X />
        </Button>
      ) : (
        <span className="w-1" />
      )}
    </span>
  );
}

/** Every company in one role, searchable; where long lists are reviewed and pruned. */
function ManageSheet({
  group,
  members,
  busy,
  onRemove,
  onAdd,
  onClose,
}: {
  group: Group;
  members: ApiProductCompany[];
  busy: boolean;
  onRemove?: (pc: ApiProductCompany) => void;
  onAdd?: () => void;
  onClose: () => void;
}) {
  const translate = useTranslate();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q ? members.filter((pc) => pc.company?.name?.toLowerCase().includes(q)) : members;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle>{group.title}</SheetTitle>
          <SheetDescription>
            {translate("products.descriptions.companies", { membersCount: members.length })}
          </SheetDescription>
        </SheetHeader>
        <div className="p-4 pb-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            delay={0}
            className="sm:w-full"
            placeholder={translate("products.placeholders.searchCompanies")}
          />
        </div>
        <ul className="flex-1 overflow-y-auto px-2 pb-2">
          {shown.length === 0 && (
            <li className="px-2 py-6 text-center text-xs text-muted-foreground">{translate("products.texts.noMatchingCompanies")}</li>
          )}
          {shown.map((pc) => (
            <li
              key={pc.company!.id}
              className="flex min-h-9 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/60"
            >
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{pc.company!.name}</span>
              {onRemove && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  disabled={busy}
                  aria-label={translate("products.buttons.remove", { name: pc.company!.name })}
                  onClick={() => onRemove(pc)}
                >
                  <X />
                </Button>
              )}
            </li>
          ))}
        </ul>
        {onAdd && (
          <SheetFooter className="border-t p-4">
            <Button onClick={onAdd} disabled={busy}>
              <Plus />
              {translate("products.buttons.add2", { singular: group.singular })}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Picks one or more active companies not already in the role (CompanySelectModalComponent). */
function AddCompaniesDialog({
  group,
  existing,
  onClose,
  onAdd,
}: {
  group: Group;
  existing: Set<number>;
  onClose: () => void;
  onAdd: (companyIds: number[]) => void;
}) {
  const translate = useTranslate();
  const [selected, setSelected] = useState<number[]>([]);
  const { data: companies = [], isLoading } = useApi(
    ep.listCompanies,
    { query: { status: "ACTIVE", requestType: "FETCH", limit: 1000, sortBy: "name", sort: "ASC" } },
    { select: (r) => r?.items ?? [] }
  );
  const options = companies.filter((c) => c.id != null && !existing.has(c.id));
  const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {translate("products.titles.add", { singular: group.singular })}
          </DialogTitle>
          <DialogDescription>{translate("products.descriptions.selectOneOrMoreCompanies")}</DialogDescription>
        </DialogHeader>
        <Command className="rounded-md border p-0">
          <CommandInput placeholder={translate("products.placeholders.searchCompanies")} />
          <CommandList className="max-h-72">
            <CommandEmpty>{isLoading ? translate("products.texts.loading") : translate("products.texts.noMatchingCompanies")}</CommandEmpty>
            {options.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.name ?? ""} ${c.id}`}
                data-checked={selected.includes(c.id!)}
                onSelect={() => toggle(c.id!)}
              >
                <Building2 />
                <span className="truncate">{c.name}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("buttons.cancel")}
          </Button>
          <Button disabled={selected.length === 0} onClick={() => onAdd(selected)}>
            {selected.length > 1
              ? translate("products.buttons.addCompanies", { selectedCount: selected.length })
              : translate("products.buttons.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Only the owning company can edit the product's data sharing agreements. */
function DataSharingAgreements({ product, onSaved }: { product: ApiProduct; onSaved: () => void }) {
  const translate = useTranslate();
  const { companyId } = useSelectedCompany();
  const { open: notify } = useNotification();
  const isOwner = !!product.associatedCompanies?.some((c) => c.type === "OWNER" && c.company?.id === companyId);
  const { control, handleSubmit, reset, formState } = useForm<Pick<ApiProduct, "dataSharingAgreements">>({
    defaultValues: { dataSharingAgreements: product.dataSharingAgreements ?? [] },
    disabled: !isOwner,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "dataSharingAgreements", keyName: "key" });

  const save = useApiMutation({
    mutationFn: (v: Pick<ApiProduct, "dataSharingAgreements">) =>
      call(ep.updateProduct, { body: { ...product, ...v } }),
    onSuccess: (_, v) => {
      reset(v);
      notify?.({ type: "success", message: translate("products.notifications.dataSharingAgreementsSaved") });
      onSaved();
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))}>
      <Section
        plain
        title={translate("products.titles.dataSharingAgreements")}
        description={translate("products.descriptions.agreementsThatCoverHowThis")}
        actions={
          isOwner && (
            <Button type="button" size="sm" variant="outline" onClick={() => append({})}>
              <Plus />
              {translate("products.buttons.addAgreement")}
            </Button>
          )
        }
      >
        {fields.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-8 text-center">
            <FileText className="mb-1 size-5 text-muted-foreground" />
            <p className="text-sm font-medium">{translate("products.texts.noDataSharingAgreements")}</p>
            <p className="text-xs text-muted-foreground">
              {isOwner
                ? translate("products.texts.addAnAgreementAndAttach")
                : translate("products.texts.onlyTheProductAdminCompany")}
            </p>
          </div>
        ) : (
          <div className={LIST}>
            {fields.map((f, i) => (
              <div key={f.key} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_auto] md:items-start">
                <TextField
                  control={control}
                  name={`dataSharingAgreements.${i}.description`}
                  label={translate("common.fields.description")}
                  rules={{
                    required: translate("common.errors.descriptionIsRequired"),
                  }}
                />
                <UploadField
                  control={control}
                  name={`dataSharingAgreements.${i}.document`}
                  label={translate("products.fields.document")}
                  rules={{
                    validate: (d) => !!(d as { storageKey?: string } | undefined)?.storageKey || translate("common.errors.documentIsRequired"),
                  }}
                />
                {isOwner && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="justify-self-end text-muted-foreground md:mt-6"
                    aria-label={translate("products.buttons.removeAgreement")}
                    onClick={() => remove(i)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Only offered once there is something to save. */}
        {isOwner && formState.isDirty && (
          <FormActions>
            <Button type="button" variant="outline" onClick={() => reset()}>
              {translate("products.buttons.discardChanges")}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner />}
              {translate("buttons.save")}
            </Button>
          </FormActions>
        )}
      </Section>
    </form>
  );
}
