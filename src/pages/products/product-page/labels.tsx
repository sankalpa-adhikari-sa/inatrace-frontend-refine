import { useNotification, useTranslate } from "@refinedev/core";
import { BarChart3, Check, Eye, EyeOff, FileDown, Layers, MessageSquare, Plus, QrCode, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { ApiProduct, ApiProductLabel, ApiProductLabelBase, ApiProductLabelField } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { SimpleSelect, StatusBadge } from "@/components/app/controls";
import { Section } from "@/components/app/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ep } from "@/lib/endpoints";
import { call, download, useApiMutation } from "@/lib/http";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";
import { QRCodeSVG } from "qrcode.react";
import { LANGUAGES, visibilityOf, labelFields, useIsOwner, type Language } from "./model";

// ---------------------------------------------------------------------------
// Label selector and actions

export function LabelBar({
  product,
  labels,
  current,
  onSelect,
  onCreated,
  onChanged,
  onDeleted,
  dirty = false,
}: {
  product: ApiProduct;
  labels: ApiProductLabelBase[];
  current?: ApiProductLabel;
  onSelect?: (id: number) => void;
  onCreated: (id: number) => void;
  onChanged?: () => void;
  onDeleted?: () => void;
  dirty?: boolean;
}) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { open: notify } = useNotification();
  const isOwner = useIsOwner(product);
  const [creating, setCreating] = useState(false);
  const base = `/product-labels/${product.id}/labels/${current?.id}`;
  const published = current?.status === "PUBLISHED";

  async function togglePublish() {
    if (!current) return;
    await call(ep.executeProductAction, {
      path: { action: published ? "UNPUBLISH_LABEL" : "PUBLISH_LABEL" },
      body: { id: current.id },
    });
    notify?.({
      type: "success",
      message: published
        ? translate("products.productPage.notifications.withdrawn")
        : translate("products.productPage.errors.published"),
      description: published
        ? translate("products.productPage.descriptions.labelIsNotPublishedAnymore")
        : translate("products.productPage.descriptions.labelHasBeenSuccessfullyPublished"),
    });
    onChanged?.();
  }

  /** Switching or creating a label remounts the editor: ask before dropping unsaved edits. */
  const discardOk = async () =>
    !dirty ||
    confirm({
      description: translate("common.descriptions.youHaveUnsavedChangesDiscard"),
      destructive: true,
      confirmLabel: translate("products.productPage.buttons.discardChanges"),
    });

  async function remove() {
    if (!current) return;
    if (
      !(await confirm({
        description: translate("products.productPage.descriptions.deleteTheLabel", { title: current.title }),
        destructive: true,
        confirmLabel: translate("buttons.delete"),
      }))
    )
      return;
    await call(ep.deleteProductLabel, { path: { id: current.id! } });
    onDeleted?.();
  }

  const newLabel = async () => {
    if (await discardOk()) setCreating(true);
  };

  return (
    <Section
      plain
      title={translate("products.productPage.titles.qrLabels")}
      description={labels.length > 0 ? translate("products.productPage.descriptions.qrLabelsIntro") : undefined}
      actions={
        isOwner &&
        labels.length > 0 && (
          <Button size="sm" variant="outline" onClick={newLabel}>
            <Plus />
            {translate("products.productPage.buttons.newLabel")}
          </Button>
        )
      }
    >
      {labels.length === 0 ? (
        <Empty className="border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <QrCode />
            </EmptyMedia>
            <EmptyTitle>{translate("products.productPage.titles.noQrLabelsYet")}</EmptyTitle>
            <EmptyDescription>{translate("products.productPage.fields.thisProductHasNoQr")}</EmptyDescription>
          </EmptyHeader>
          {isOwner && (
            <EmptyContent>
              <Button onClick={newLabel}>
                <Plus />
                {translate("products.productPage.buttons.newLabel")}
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div
          role="group"
          aria-label={translate("products.productPage.titles.qrLabels")}
          className="-m-1 flex items-stretch gap-3 overflow-x-auto p-1"
        >
          {labels.map((l) => (
            <LabelCard
              key={l.id}
              label={l}
              selected={l.id === current?.id}
              onSelect={async () => {
                if (l.id !== current?.id && (await discardOk())) onSelect?.(l.id!);
              }}
            />
          ))}
        </div>
      )}
      {current && (
        // Which label the actions below (and the form under them) apply to.
        <div className="flex flex-col gap-3 rounded-xl border border-foreground/8 bg-card p-3 shadow-card md:p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{translate("products.productPage.titles.selectedLabel")}</span>
              <span className="truncate font-heading text-base font-semibold">
                {current.title || translate("products.productPage.titles.untitled")}
              </span>
              {current.language && <Badge variant="outline">{current.language}</Badge>}
              <StatusBadge status={current.status} />
            </div>
            {isOwner && (
              <Button
                size="sm"
                className="ml-auto"
                variant={published ? "outline" : "default"}
                disabled={dirty}
                onClick={togglePublish}
              >
                {published ? <EyeOff /> : <Send />}
                {published
                  ? translate("products.productPage.buttons.unpublish")
                  : translate("products.productPage.buttons.publish")}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-foreground/8 pt-3">
            <ButtonGroup aria-label={translate("products.productPage.texts.viewAndPrint")}>
              <Button
                size="sm"
                variant="outline"
                disabled={dirty}
                onClick={() => window.open(`/p-cd/${current.uuid}/EMPTY`, "_blank")}
              >
                <Eye />
                {translate("products.productPage.buttons.viewLabel")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={dirty}
                onClick={() =>
                  download(
                    ep.getProductLabelInstructions,
                    { path: { id: current.id! } },
                    `${current.title || "label"}-instructions.pdf`
                  )
                }
              >
                <FileDown />
                {translate("products.productPage.buttons.instructions")}
              </Button>
            </ButtonGroup>
            {isOwner && (
              <ButtonGroup aria-label={translate("products.productPage.texts.labelActivity")}>
                <Button size="sm" variant="outline" disabled={dirty} onClick={() => navigate(`${base}/batches`)}>
                  <Layers />
                  {translate("products.productPage.buttons.batches")}
                </Button>
                <Button size="sm" variant="outline" disabled={dirty} onClick={() => navigate(`${base}/feedback`)}>
                  <MessageSquare />
                  {translate("products.productPage.buttons.feedback")}
                </Button>
                <Button size="sm" variant="outline" disabled={dirty} onClick={() => navigate(`${base}/statistics`)}>
                  <BarChart3 />
                  {translate("products.productPage.buttons.statistics")}
                </Button>
              </ButtonGroup>
            )}
            {isOwner && (
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={remove}
              >
                <Trash2 />
                {translate("products.productPage.buttons.deleteLabel")}
              </Button>
            )}
          </div>
          {dirty && (
            <p className="text-xs text-muted-foreground">{translate("products.productPage.texts.saveYourChangesToUse")}</p>
          )}
        </div>
      )}
      {creating && (
        <NewLabelDialog
          productId={product.id!}
          fields={current?.fields}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            onCreated(id);
          }}
        />
      )}
    </Section>
  );
}

/** LanguageForLabelModalComponent + createLabel/setLanguageForLabel. */
function NewLabelDialog({
  productId,
  fields,
  onClose,
  onCreated,
}: {
  productId: number;
  /** A new label starts with the shown fields of the current label (currentLabelFields). */
  fields?: ApiProductLabelField[];
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const translate = useTranslate();
  const [title, setTitle] = useState("");
  const [tried, setTried] = useState(false);
  const [language, setLanguage] = useState<Language | null>("EN");
  const create = useApiMutation({
    mutationFn: async () => {
      const visibility = visibilityOf(undefined);
      const created = await call(ep.createProductLabel, {
        body: { productId, title, language: language!, fields: fields?.length ? fields : labelFields(visibility) },
      });
      const labelId = created?.id;
      if (labelId != null && language !== "EN") {
        const content = await call(ep.getProductLabelContent, { path: { id: labelId } });
        if (content) {
          const { id: _id, ...rest } = content;
          await call(ep.updateProductLabelContent, {
            body: { ...rest, labelId, settings: { ...content.settings, language: language! } },
          });
        }
      }
      return labelId;
    },
    onSuccess: (id) => id != null && onCreated(id),
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{translate("products.productPage.titles.createNewLabel")}</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel>{translate("products.productPage.fields.labelTitle")}</FieldLabel>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            placeholder={translate("products.productPage.placeholders.enterTheLabelTitle")}
            aria-invalid={tried && !title.trim()}
            autoFocus
          />
          {tried && !title.trim() && (
            <FieldError>
              {translate("products.productPage.errors.labelTitleIsRequired")}
            </FieldError>
          )}
        </Field>
        <Field>
          <FieldLabel>{translate("products.productPage.fields.selectLabelLanguage")}</FieldLabel>
          <SimpleSelect options={LANGUAGES} value={language} onChange={setLanguage} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("buttons.cancel")}
          </Button>
          <Button
            disabled={!language || create.isPending}
            onClick={() => {
              setTried(true);
              if (title.trim()) create.mutate();
            }}
          >
            {translate("buttons.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const QR_ACTIVE = "#4B382A";
const QR_INACTIVE = "#939393";

/**
 * Label card with a "TRY ME!" QR code that opens the label's public page
 * (LabelSelectorCardComponent). The link goes through `/<language>/q/<uuid>`, so
 * scans are logged and the page opens in the label's language.
 */
function LabelCard({
  label,
  selected,
  onSelect,
}: {
  label: { id?: number; uuid?: string; title?: string; language?: string; status?: string };
  selected: boolean;
  onSelect: () => void;
}) {
  const translate = useTranslate();
  const lang = label.language?.toLowerCase();
  const link = label.uuid ? `${env.appBaseUrl}${lang ? `/${lang}` : ""}/q/${label.uuid}` : "";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        // The printed label is always white, also in dark mode.
        "relative flex w-40 shrink-0 flex-col items-center gap-1.5 rounded-lg border bg-white p-2 text-center transition-[box-shadow,border-color] outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        selected
          ? "border-primary text-primary-strong shadow-md ring-2 ring-primary"
          : "border-foreground/10 text-neutral-500 hover:border-primary/50 hover:shadow-sm"
      )}
    >
      <div className="flex w-full items-center justify-between gap-1">
        {selected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-1.5 py-0.5 text-[0.625rem] font-medium text-primary-foreground">
            <Check className="size-3" />
            {translate("products.productPage.texts.editing")}
          </span>
        ) : (
          <img src="/logo-INA.png" alt="" className="w-7 opacity-50 grayscale" />
        )}
        {label.status === "PUBLISHED" && (
          <Badge className="h-4 px-1.5">
            {translate("products.productPage.titles.published")}
          </Badge>
        )}
      </div>
      <div className="line-clamp-2 w-full text-xs font-medium">
        {label.title || translate("products.productPage.titles.untitled")}
        {label.language && <span className="font-normal text-muted-foreground"> · {label.language}</span>}
      </div>
      <div className="text-[0.625rem] font-semibold tracking-wide">
        {translate("products.productPage.fields.tryMe")}
      </div>
      {link && <QRCodeSVG value={link} size={110} fgColor={selected ? QR_ACTIVE : QR_INACTIVE} />}
      <div className="mt-auto text-[0.5rem] text-secondary">{env.appName}™</div>
    </button>
  );
}
