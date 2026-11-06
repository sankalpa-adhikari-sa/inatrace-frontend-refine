import { useTranslate } from "@refinedev/core";
import { RichHtml } from "@/components/app/rich-html";
import { useB2c } from "./context";
import { B2cMain } from "./layout";

/** `terms-of-use` (B2cTermsComponent) */
export function B2cTerms() {
  const translate = useTranslate();
  const { field } = useB2c();
  return (
    <B2cMain title={translate("b2c.titles.termsOfUse")}>
      <RichHtml html={field("settings.termsOfUseText")} />
    </B2cMain>
  );
}

/** `privacy-policy` (B2cPrivacyComponent) */
export function B2cPrivacy() {
  const translate = useTranslate();
  const { field } = useB2c();
  return (
    <B2cMain title={translate("b2c.titles.privacyPolicy")}>
      <RichHtml html={field("settings.privacyPolicyText")} />
    </B2cMain>
  );
}
