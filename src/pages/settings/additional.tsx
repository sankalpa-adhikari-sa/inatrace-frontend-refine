import { useNotification, useTranslate } from "@refinedev/core";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { TextField, TextareaField } from "@/components/app/form-fields";
import { FormActions, Section } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { call, useApi, useApiMutation } from "@/lib/http";
import { ep } from "@/lib/endpoints";

const HELPER_LINK = "PRODUCT_LABELS_HELPER_LINK";
const UNPUBLISHED_TEXT = "UNPUBLISHED_PRODUCT_LABEL_TEXT";

function useSetting(name: string) {
  return useApi(ep.getGlobalSettings, { path: { name } }, { select: (r) => r?.value ?? "" });
}

export function SettingsAdditional() {
  const translate = useTranslate();
  const { open: notify } = useNotification();
  const helperLink = useSetting(HELPER_LINK);
  const unpublishedText = useSetting(UNPUBLISHED_TEXT);

  const { control, handleSubmit, reset, formState } = useForm({
    defaultValues: { labelsHelperLink: "", unpublishedProductLabelText: "" },
  });

  useEffect(() => {
    if (helperLink.isSuccess && unpublishedText.isSuccess) {
      reset({ labelsHelperLink: helperLink.data, unpublishedProductLabelText: unpublishedText.data });
    }
  }, [helperLink.isSuccess, helperLink.data, unpublishedText.isSuccess, unpublishedText.data, reset]);

  const save = useApiMutation({
    mutationFn: async (v: { labelsHelperLink: string; unpublishedProductLabelText: string }) => {
      await call(ep.updateGlobalSettings, {
        path: { name: UNPUBLISHED_TEXT },
        body: { value: v.unpublishedProductLabelText, isPublic: true },
      });
      await call(ep.updateGlobalSettings, {
        path: { name: HELPER_LINK },
        body: { value: v.labelsHelperLink, isPublic: false },
      });
    },
    onSuccess: (_, v) => {
      reset(v);
      notify?.({ type: "success", message: translate("settings.notifications.settingsSaved") });
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="flex flex-col gap-6">
      <Section title={translate("settings.titles.additionalSettings")}>
        <FieldGroup>
          <TextField
            control={control}
            name="labelsHelperLink"
            type="url"
            label={translate("settings.fields.additionalInformationForQrMultiple")}
          />
          <TextareaField
            control={control}
            name="unpublishedProductLabelText"
            label={translate("settings.fields.unpublishedProductLabelsText")}
          />
        </FieldGroup>
      </Section>
      <FormActions>
        <Button type="submit" disabled={!formState.isDirty || save.isPending}>
          {save.isPending && <Spinner />}
          {translate("buttons.save")}
        </Button>
      </FormActions>
    </form>
  );
}
