import { useList, useTranslate } from "@refinedev/core";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { ApiProductListResponse } from "@/client/types.gen";
import { SearchInput, SimpleSelect, Toolbar } from "@/components/app/controls";
import { PageHeader } from "@/components/app/page";
import { PRODUCT_GRID, ProductCard, ProductCardSkeleton } from "@/components/app/product-card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useIdentity, useSelectedCompany } from "@/hooks/use-session";
import { useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";

const PAGE_SIZE = 12;

/** `/product-labels` (ProductListComponent). */
export function ProductList() {
  const translate = useTranslate();
  const { user } = useIdentity();
  const isSystemAdmin = user?.role === "SYSTEM_ADMIN";
  const [mineOnly, setMineOnly] = useState(true);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const { result, query } = useList<ApiProductListResponse>({
    resource: "products",
    meta: { scope: isSystemAdmin && !mineOnly ? "all" : "mine" },
    filters: [
      { field: "name", operator: "eq", value: name || undefined },
      { field: "status", operator: "eq", value: status || undefined },
    ],
    pagination: { currentPage: page, pageSize: PAGE_SIZE },
  });
  const total = result.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title={translate("products.titles.products")}
        description={translate("products.descriptions.listOfProductsTotal", { total })}
        actions={
          <Button data-onboarding="new-product" onClick={() => setCreating(true)}>
            <Plus />
            {translate("products.buttons.newProduct")}
          </Button>
        }
      />
      <Toolbar>
        <SearchInput
          value={name}
          onChange={(v) => {
            setName(v);
            setPage(1);
          }}
          placeholder={translate("common.placeholders.searchByName")}
        />
        <SimpleSelect
          className="sm:w-40"
          options={[
            { value: "", label: translate("common.fields.allStatuses") },
            { value: "ACTIVE", label: translate("products.fields.active") },
            { value: "DISABLED", label: translate("products.fields.disabled") },
          ]}
          value={status}
          onChange={(v) => setStatus(v ?? "")}
        />
        {isSystemAdmin && (
          <div className="flex items-center gap-2">
            <Switch id="my-products" checked={mineOnly} onCheckedChange={setMineOnly} />
            <Label htmlFor="my-products">{translate("products.fields.myProductsOnly")}</Label>
          </div>
        )}
      </Toolbar>
      {query.isLoading ? (
        <div className={PRODUCT_GRID} aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : result.data.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>{translate("products.titles.noProducts")}</EmptyTitle>
            <EmptyDescription>{translate("products.descriptions.createAProductToStart")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className={PRODUCT_GRID}>
          {result.data.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {translate("buttons.previous")}
          </Button>
          <span className="text-muted-foreground">
            {translate("common.texts.pageOf", { page, pages })}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            {translate("buttons.next")}
          </Button>
        </div>
      )}
      {creating && <NewProductDialog onClose={() => setCreating(false)} />}
    </>
  );
}

/** NewProductModalComponent: choose the owning company and value chain. */
function NewProductDialog({ onClose }: { onClose: () => void }) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const { companyId: selected } = useSelectedCompany();
  const [companyId, setCompanyId] = useState<number | null>(selected);
  const [valueChainId, setValueChainId] = useState<number | null>(null);

  const { data: companies = [] } = useApi(
    ep.listCompanies,
    { query: { requestType: "FETCH", limit: 500, status: "ACTIVE" } },
    { select: (r) => r?.items ?? [] }
  );
  const { data: valueChains = [] } = useApi(
    ep.getCompanyValueChains,
    { path: { id: companyId ?? 0 }, query: { requestType: "FETCH", limit: 500 } },
    { enabled: companyId != null, select: (r) => r?.items ?? [] }
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translate("products.titles.newProduct")}</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel>{translate("common.fields.company")}</FieldLabel>
          <SimpleSelect
            options={companies.map((c) => ({ value: c.id!, label: c.name ?? "" }))}
            value={companyId}
            onChange={(id) => {
              setCompanyId(id);
              setValueChainId(null);
            }}
            placeholder={translate("products.placeholders.selectTheCompanyThatOwns")}
          />
        </Field>
        <Field>
          <FieldLabel>
            {translate("products.fields.valueChain")}
          </FieldLabel>
          <SimpleSelect
            options={valueChains.map((v) => ({ value: v.id!, label: v.name ?? "" }))}
            value={valueChainId}
            onChange={setValueChainId}
            disabled={companyId == null}
            placeholder={translate("products.placeholders.selectValueChain")}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("buttons.cancel")}
          </Button>
          <Button
            disabled={companyId == null || valueChainId == null}
            data-onboarding="new-product-submit"
            onClick={() => navigate(`/product-labels/new/${companyId}/${valueChainId}`)}
          >
            {translate("buttons.continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
