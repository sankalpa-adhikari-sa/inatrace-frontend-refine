import { useNotification, useTranslate } from "@refinedev/core";
import { BarChart3, Eye, FileDown, Layers, MessageSquare, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { ApiProduct, ApiProductLabel, ApiProductLabelBase, ApiProductLabelField } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { SimpleSelect } from "@/components/app/controls";
import { Section } from "@/components/app/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ep } from "@/lib/endpoints";
import { call, download, useApiMutation } from "@/lib/http";
import { cn } from "@/lib/utils";
import { env } from "@/lib/env";
import { QRCodeSVG } from "qrcode.react";
import { t } from "@/lib/i18n";
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

  return (
    <Section plain title={translate("products.productPage.titles.qrLabels")}>
      <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
        {labels.map((l) => (
          <LabelCard key={l.id} label={l} selected={l.id === current?.id} onSelect={() => onSelect?.(l.id!)} />
        ))}
        {isOwner && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-md border border-dashed text-xs text-muted-foreground hover:border-primary hover:text-foreground"
          >
            <Plus className="size-5" />
            {translate("products.productPage.buttons.newLabel")}
          </button>
        )}
      </div>
      {current && (
        <div className="flex flex-wrap gap-2 border-t pt-3">
          {isOwner && (
            <Button size="sm" variant={published ? "outline" : "default"} disabled={dirty} onClick={togglePublish}>
              {published
                ? translate("products.productPage.buttons.unpublish")
                : translate("products.productPage.buttons.publish")}
            </Button>
          )}
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
          {isOwner && (
            <>
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
            </>
          )}
          {isOwner && (
            <Button size="sm" variant="destructive" onClick={remove}>
              <Trash2 />
              {translate("products.productPage.buttons.deleteLabel")}
            </Button>
          )}
          {dirty && (
            <p className="w-full text-xs text-muted-foreground">{translate("products.productPage.texts.saveYourChangesToUse")}</p>
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
      className={cn(
        "flex w-40 shrink-0 flex-col items-center gap-1.5 rounded-md border bg-white p-2 text-center transition-colors hover:outline-3 hover:-outline-offset-3",
        selected ? "border-primary text-primary-strong" : "text-neutral-500"
      )}
    >
      <div className="flex w-full items-center justify-between gap-1">
        <img src="/logo-INA.png" alt="" className={cn("w-7", !selected && "opacity-50 grayscale")} />
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
