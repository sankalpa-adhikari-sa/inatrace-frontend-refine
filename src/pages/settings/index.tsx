import { Navigate, Route, Routes } from "react-router";
import { PageHeader, PageTabs } from "@/components/app/page";
import { SettingsAdditional } from "./additional";
import { SettingsTypes } from "./types";
import { useTranslate } from "@refinedev/core";

export function SettingsPage() {
  const translate = useTranslate();
  return (
    <>
      <PageHeader title={translate("settings.titles.settings")} />
      <PageTabs
        tabs={[
          { label: translate("settings.fields.additionalSettings"), to: "/settings/additional" },
          { label: translate("settings.fields.types"), to: "/settings/types" },
        ]}
      />
      <Routes>
        <Route index element={<Navigate to="additional" replace />} />
        <Route path="additional" element={<SettingsAdditional />} />
        <Route path="types" element={<SettingsTypes />} />
      </Routes>
    </>
  );
}
