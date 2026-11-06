// Beyco offer form (BeycoOfferListComponent).
import { useNotification, useTranslate } from "@refinedev/core";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import type { ApiBeycoOrderFields } from "@/client/types.gen";
import { TextField } from "@/components/app/form-fields";
import { FormActions, PageHeader, PageLoader, Section } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useSelectedCompany } from "@/hooks/use-session";
import { call, useApi, useApiMutation } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { CoffeeSection } from "./coffee-section";
import { type OfferForm, toApi, toForm } from "./model";
import { useBeycoToken } from "./token";

/** `/my-stock/beyco/list?id=…` */
export function BeycoOfferPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { companyId } = useSelectedCompany();
  const token = useBeycoToken((s) => s.token);
  const ids = params.getAll("id").map(Number);

  useEffect(() => {
    if (!token || ids.length === 0) navigate("/my-stock/all-stock", { replace: true });
  }, [token, ids.length, navigate]);

  const { data: fields, isLoading } = useApi(
    ep.getBeycoOrderFieldsForSelectedStockOrders,
    { path: { companyId: companyId ?? 0 }, query: { id: ids } },
    { enabled: !!token && companyId != null && ids.length > 0, select: (r) => r }
  );

  if (isLoading || !fields || !token) return <PageLoader />;
  return <OfferEditor fields={fields} accessToken={token.accessToken!} companyId={companyId!} />;
}

function OfferEditor({
  fields,
  accessToken,
  companyId,
}: {
  fields: ApiBeycoOrderFields;
  accessToken: string;
  companyId: number;
}) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const { open: notify } = useNotification();
  const { control, handleSubmit } = useForm<OfferForm>({ defaultValues: toForm(fields) });
  const coffees = useFieldArray({ control, name: "coffees", keyName: "key" });

  const send = useApiMutation({
    mutationFn: (v: OfferForm) =>
      call(ep.sendBeycoOrder, { path: { companyId }, headers: { "X-Beyco-Token": accessToken }, body: toApi(v) }),
    onSuccess: () => {
      notify?.({
        type: "success",
        message: translate("stock.beyco.notifications.beycoOrderCreated"),
        description: translate("stock.beyco.notifications.youSuccessfullyCreatedABeyco"),
      });
      navigate("/my-stock/all-stock");
    },
  });

  return (
    <>
      <PageHeader title={translate("stock.beyco.titles.beycoOffer")} back="/my-stock/all-stock" />
      <form onSubmit={handleSubmit((v) => send.mutate(v))} className="flex flex-col gap-6">
        <Section title={translate("stock.beyco.titles.generalValues")}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={control}
              name="title"
              label={translate("stock.beyco.fields.offerTitle")}
              rules={{
                required: translate("stock.beyco.errors.offerTitleIsRequired"),
                maxLength: { value: 70, message: translate("stock.beyco.errors.atMost70Characters") },
              }}
            />
            <TextField
              control={control}
              name="availableAt"
              type="date"
              label={translate("stock.beyco.fields.availableAt")}
              rules={{ required: translate("common.errors.required") }}
            />
            <TextField
              control={control}
              name="address"
              label={translate("stock.beyco.fields.addressOfPortOfExport")}
              rules={{ required: translate("common.errors.required") }}
            />
            <TextField
              control={control}
              name="country"
              label={translate("stock.beyco.fields.countryOfPortOfExport")}
              rules={{ required: translate("common.errors.required") }}
            />
            <TextField
              control={control}
              name="latitude"
              type="number"
              label={translate("stock.beyco.fields.latitudeOfPortOfExport")}
              rules={{ required: translate("common.errors.required") }}
            />
            <TextField
              control={control}
              name="longitude"
              type="number"
              label={translate("stock.beyco.fields.longitudeOfPortOfExport")}
              rules={{ required: translate("common.errors.required") }}
            />
          </FieldGroup>
        </Section>
        {coffees.fields.map((f, i) => (
          <CoffeeSection key={f.key} index={i} control={control} />
        ))}
        <FormActions>
          <Button type="button" variant="outline" onClick={() => navigate("/my-stock/all-stock")}>
            {translate("buttons.cancel")}
          </Button>
          <Button type="submit" disabled={send.isPending}>
            {translate("stock.beyco.buttons.sendToBeyco")}
          </Button>
        </FormActions>
      </form>
    </>
  );
}
