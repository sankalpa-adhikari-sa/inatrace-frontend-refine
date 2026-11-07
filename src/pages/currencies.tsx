import { useInvalidate, useNotification, useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import type { ApiCurrencyType } from "@/client/types.gen";
import { PageHeader, Section } from "@/components/app/page";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ep } from "@/lib/endpoints";
import { call } from "@/lib/http";

export function CurrencyList() {
  const translate = useTranslate();
  return (
    <>
      <PageHeader title={translate("currencies.titles.currencyList")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <CurrencyTable enabled />
        <CurrencyTable enabled={false} />
      </div>
    </>
  );
}

function CurrencyTable({ enabled }: { enabled: boolean }) {
  const translate = useTranslate();
  const invalidate = useInvalidate();
  const { open: notify } = useNotification();

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<ApiCurrencyType>();

    return [
      columnHelper.accessor("code", {
        header: translate("currencies.fields.code"),
        meta: { card: "title" },
        enableSorting: false,
      }),
      columnHelper.accessor("label", {
        header: translate("common.fields.label"),
        meta: { card: "subtitle" },
        enableSorting: false,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            variant={enabled ? "outline" : "secondary"}
            size="sm"
            onClick={async () => {
              const id = row.original.id!;
              try {
                if (enabled) await call(ep.disableCurrency, { path: { id } });
                else await call(ep.enableCurrency, { path: { id } });
                invalidate({ resource: "currencies", invalidates: ["list"] });
              } catch {
                notify?.({
                  type: "error",
                  message: translate("notifications.error"),
                  description: enabled ? translate("currencies.notifications.cannotDisableCurrency") : translate("currencies.notifications.cannotEnableCurrency"),
                });
              }
            }}
          >
            {enabled
              ? translate("currencies.buttons.disable")
              : translate("currencies.buttons.enable")}
          </Button>
        ),
      }),
    ];
  }, [enabled, invalidate, notify, translate]);

  const table = useTable<ApiCurrencyType>({
    columns,
    refineCoreProps: {
      resource: "currencies",
      meta: { enabled },

      syncWithLocation: false,
    },
  });

  const { setFilters } = table.refineCore;

  return (
    <Section plain
      title={
        enabled
          ? translate("currencies.titles.enabledCurrencies")
          : translate("currencies.titles.disabledCurrencies")
      }
      description={translate("common.descriptions.total", { total: table.refineCore.result.total ?? 0 })}
    >
      <div>
        <Input
          placeholder={translate("currencies.placeholders.search")}
          onChange={(e) => {
            setFilters([
              {
                field: "query",
                operator: "contains",
                value: e.target.value || undefined,
              },
            ]);
          }}
        />
      </div>
      <DataTable table={table} />
    </Section>
  );
}
