import { CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import type { ApiCompanyOnboardingState } from "@/client/types.gen";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ep } from "@/lib/endpoints";
import { call } from "@/lib/http";
import { cn } from "@/lib/utils";
import { type OnboardingFlow, useOnboarding } from "@/stores/onboarding";
import { useTranslate } from "@refinedev/core";
import { t } from "@/lib/i18n";

const CHECKLIST: { flow: Exclude<OnboardingFlow, "tour">; label: string; done: keyof ApiCompanyOnboardingState }[] = [
  {
    flow: "product",
    get label() { return t("onboarding.fields.addAProduct"); },
    done: "hasCreatedProduct",
  },
  {
    flow: "facility",
    get label() { return t("onboarding.fields.addYourFirstFacility"); },
    done: "hasCreatedFacility",
  },
  {
    flow: "processingAction",
    get label() { return t("onboarding.fields.addYourFirstProcessingAction"); },
    done: "hasCreatedProcessingAction",
  },
  {
    flow: "farmers",
    get label() { return t("onboarding.fields.addYourFarmers"); },
    done: "hasAddedFarmers",
  },
];

/** SelfOnboardingChecklistModalComponent: open items start their flow. */
export function ChecklistDialog({ companyId, onClose }: { companyId: number; onClose: () => void }) {
  const translate = useTranslate();
  const set = useOnboarding((s) => s.set);
  const [progress, setProgress] = useState<ApiCompanyOnboardingState | null>(null);
  useEffect(() => {
    call(ep.getCompanyOnboardingState, { path: { id: companyId } }).then(
      (s) => setProgress(s ?? {}),
      () => setProgress({})
    );
  }, [companyId]);

  const row = (label: string, done: boolean, onClick?: () => void) => (
    <li key={label}>
      <button
        type="button"
        disabled={done || !onClick}
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm",
          done ? "text-muted-foreground line-through" : "hover:bg-muted"
        )}
      >
        {done ? <CheckCircle2 className="size-4 text-primary" /> : <Circle className="size-4 text-muted-foreground" />}
        {label}
      </button>
    </li>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{translate("onboarding.titles.getStartedChecklist")}</DialogTitle>
        </DialogHeader>
        {progress == null ? (
          <Spinner className="mx-auto" />
        ) : (
          <ul className="flex flex-col">
            {row(translate("onboarding.fields.createAnAccount"), true)}
            {CHECKLIST.map((item) =>
              row(item.label, !!progress[item.done], () => {
                set(item.flow, 1);
                onClose();
              })
            )}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
