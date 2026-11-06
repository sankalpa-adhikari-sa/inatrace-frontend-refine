import { useNotification, useTranslate } from "@refinedev/core";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { ApiProductLabelFeedback } from "@/client/types.gen";
import { SimpleSelect } from "@/components/app/controls";
import { CheckboxField, EMAIL_PATTERN, TextField, TextareaField } from "@/components/app/form-fields";
import { RichHtml } from "@/components/app/rich-html";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ep } from "@/lib/endpoints";
import { call } from "@/lib/http";
import { t } from "@/lib/i18n";
import { useB2c } from "./context";
import { B2cMain } from "./layout";

const TASTE = [
  { value: "Better", get label() { return t("b2c.fields.better"); } },
  { value: "Same", get label() { return t("b2c.fields.same"); } },
  { value: "Worse", get label() { return t("b2c.fields.worse"); } },
];
const GENDER = [
  { value: "Male", get label() { return t("b2c.fields.male"); } },
  { value: "Female", get label() { return t("b2c.fields.female"); } },
  { value: "N/A", label: "N/A" },
];

type FeedbackForm = ApiProductLabelFeedback & { questionnaireAnswers: Record<string, string> };

/** `feedback` (B2cFeedbackComponent) */
export function B2cFeedback() {
  const translate = useTranslate();
  const { settings, uuid, productName, field } = useB2c();
  const { open: notify } = useNotification();
  const empty: FeedbackForm = { feedback: "", email: "", gdprConsent: false, questionnaireAnswers: {} };
  const { control, handleSubmit, reset, watch, setValue } = useForm<FeedbackForm>({ defaultValues: empty });
  const answers = watch("questionnaireAnswers");

  const submit = useMutation({
    mutationFn: (body: FeedbackForm) => call(ep.addProductLabelFeedback, { path: { labelUid: uuid }, body }),
    onSuccess: () => {
      notify?.({
        type: "success",
        message: translate("b2c.notifications.submitted"),
        description: translate("b2c.notifications.successfullySubmitted"),
      });
      reset(empty);
    },
  });

  return (
    <B2cMain title={translate("b2c.titles.feedback")}>
      <form onSubmit={handleSubmit((v) => submit.mutate(v))}>
        <FieldGroup>
          <TextareaField
            control={control}
            name="feedback"
            label={translate("b2c.fields.theProducersOfLookForward", { productName })}
            description={translate("b2c.descriptions.describeInMax500Characters")}
            rules={{
              maxLength: {
                value: 500,
                message: translate("b2c.errors.feedbackShouldNotExceed500"),
              },
            }}
          />
          <h2 className="font-semibold">
            {translate("b2c.titles.pleaseAlsoAnswerTheFollowing")}
          </h2>
          <Field>
            <FieldLabel>
              {translate("b2c.fields.1HowWouldYouRate", { productName })}
            </FieldLabel>
            <SimpleSelect
              options={TASTE}
              value={answers?.rateTaste ?? null}
              onChange={(v) => setValue("questionnaireAnswers.rateTaste", v ?? "")}
            />
          </Field>
          <TextField
            control={control}
            name="questionnaireAnswers.age"
            label={translate("b2c.fields.2YourAge")}
            placeholder={translate("b2c.placeholders.enterYourAge")}
          />
          <Field>
            <FieldLabel>{translate("b2c.fields.3Gender")}</FieldLabel>
            <SimpleSelect
              options={GENDER}
              value={answers?.gender ?? null}
              onChange={(v) => setValue("questionnaireAnswers.gender", v ?? "")}
            />
          </Field>
          <TextField
            control={control}
            name="email"
            type="email"
            label={translate("b2c.fields.inCaseYouWouldLike")}
            placeholder={translate("b2c.placeholders.enterEMail")}
            rules={{ pattern: EMAIL_PATTERN }}
          />
          <div className="flex flex-col gap-2">
            <span className="font-medium">
              {translate("b2c.fields.permissionToContact")}
            </span>
            <RichHtml html={field("settings.gdprText")} className="text-xs text-neutral-600" />
            <CheckboxField
              control={control}
              name="gdprConsent"
              label={translate("b2c.fields.gdprConsent")}
              rules={{ validate: (v) => !!v || translate("b2c.errors.gdprConsentIsRequired") }}
            />
          </div>
          <button
            type="submit"
            disabled={submit.isPending}
            className="self-start rounded px-16 py-3 text-sm font-semibold tracking-wider text-white uppercase disabled:opacity-60"
            style={{ backgroundColor: settings.secondaryColor }}
          >
            {translate("b2c.buttons.submit")}
          </button>
        </FieldGroup>
      </form>
    </B2cMain>
  );
}
