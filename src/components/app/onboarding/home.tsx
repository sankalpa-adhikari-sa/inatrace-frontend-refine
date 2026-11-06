import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIdentity, useSelectedCompany } from "@/hooks/use-session";
import { ep } from "@/lib/endpoints";
import { call } from "@/lib/http";
import { type OnboardingFlow, useOnboarding } from "@/stores/onboarding";
import { useTranslate } from "@refinedev/core";
import { ChecklistDialog } from "./checklist-dialog";

const TOOLBOX_URL = "https://www.sustainable-supply-chains.org/toolbox#c10159";

const WELCOME_DISMISSED = "dismissedOnboardingWelcomeModal";

type DialogKind = "assistant" | "welcome" | "checklist" | `success-${OnboardingFlow}` | null;

/**
 * Home page part of the onboarding: the assistant button, the welcome dialog
 * for companies that haven't set anything up, the checklist, and the success
 * dialog after a flow finishes (UserHomeComponent).
 */
export function OnboardingHome() {
  const translate = useTranslate();
  const { user } = useIdentity();
  const { companyId } = useSelectedCompany();
  const state = useOnboarding();
  const [dialog, setDialog] = useState<DialogKind>(null);

  useEffect(() => {
    if (companyId == null) return;
    const finished = (["product", "facility", "processingAction", "farmers", "tour"] as const).find(
      (f) => state[f] === "success"
    );
    if (finished) return setDialog(`success-${finished}`);
    let cancelled = false;
    call(ep.getCompanyOnboardingState, { path: { id: companyId } })
      .then((s) => {
        const fresh =
          s && !s.hasCreatedProduct && !s.hasCreatedFacility && !s.hasCreatedProcessingAction && !s.hasAddedFarmers;
        let dismissed = false;
        try {
          dismissed = sessionStorage.getItem(WELCOME_DISMISSED) === "true";
        } catch {
          // storage unavailable
        }
        if (!cancelled && fresh && !dismissed) setDialog("welcome");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const dismissWelcome = () => {
    try {
      sessionStorage.setItem(WELCOME_DISMISSED, "true");
    } catch {
      // storage unavailable
    }
  };
  const close = () => setDialog(null);
  const name = user?.name ?? "";

  const success = (flow: OnboardingFlow, title: string, text: string) => (
    <MessageDialog
      title={title}
      text={text}
      actions={
        <Button
          onClick={() => {
            state.set(flow, null);
            setDialog("checklist");
          }}
        >
          {translate("buttons.continue")}
        </Button>
      }
    />
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setDialog("assistant")}
        className="fixed right-4 bottom-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground shadow-lg hover:bg-primary/90"
      >
        <img src="/logo-INA.png" alt="" className="size-5 rounded-sm bg-white object-contain" />
        {translate("onboarding.buttons.needHelp")}
      </button>

      {dialog === "assistant" && (
        <MessageDialog
          onClose={close}
          title={translate("onboarding.titles.hiGladYouAreHere", { name })}
          text={translate("onboarding.descriptions.howCanIAssistYou")}
          actions={
            <div className="flex w-full flex-col gap-2">
              <Button variant="outline" onClick={() => setDialog("checklist")}>
                {translate("onboarding.buttons.iWantToConfigureThe")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  state.set("tour", 1);
                  close();
                }}
              >
                {translate("onboarding.buttons.iWantAGuidedTour")}
              </Button>
              <Button
                variant="outline"
                nativeButton={false}
                render={<a href={TOOLBOX_URL} target="_blank" rel="nofollow noreferrer" />}
              >
                {translate("onboarding.buttons.iWantToAccessThe")}
              </Button>
            </div>
          }
        />
      )}

      {dialog === "welcome" && (
        <MessageDialog
          title={translate("onboarding.titles.welcomeOnBoard", { name })}
          text={translate("onboarding.descriptions.getStarted")}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  dismissWelcome();
                  close();
                }}
              >
                {translate("onboarding.buttons.maybeLater")}
              </Button>
              <Button
                onClick={() => {
                  dismissWelcome();
                  setDialog("checklist");
                }}
              >
                {translate("onboarding.buttons.guideMe")}
              </Button>
            </>
          }
        />
      )}

      {dialog === "checklist" && companyId != null && <ChecklistDialog companyId={companyId} onClose={close} />}

      {dialog === "success-product" && success("product", translate("onboarding.titles.yay"), translate("onboarding.descriptions.productAdded"))}
      {dialog === "success-facility" &&
        success("facility", translate("onboarding.titles.fantastic"), translate("onboarding.descriptions.facilityAdded"))}
      {dialog === "success-processingAction" &&
        success("processingAction", translate("onboarding.titles.great"), translate("onboarding.descriptions.processingActionAdded"))}
      {dialog === "success-farmers" && (
        <MessageDialog
          title={translate("onboarding.titles.great")}
          text={translate("onboarding.descriptions.farmersAdded")}
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  state.set("farmers", null);
                  close();
                }}
              >
                {translate("onboarding.buttons.imGood")}
              </Button>
              <Button
                onClick={() => {
                  state.set("farmers", null);
                  state.set("tour", 1);
                  close();
                }}
              >
                {translate("onboarding.buttons.showMeAround")}
              </Button>
            </>
          }
        />
      )}
      {dialog === "success-tour" && (
        <MessageDialog
          title={translate("onboarding.titles.awesome")}
          text={translate("onboarding.descriptions.stockTourDone")}
          actions={
            <Button
              onClick={() => {
                state.set("tour", null);
                close();
              }}
            >
              {translate("buttons.ok")}
            </Button>
          }
        />
      )}
    </>
  );
}

function MessageDialog({
  title,
  text,
  actions,
  onClose,
}: {
  title: string;
  text: string;
  actions: ReactNode;
  onClose?: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose?.()} disablePointerDismissal={!onClose}>
      <DialogContent className="sm:max-w-md" showCloseButton={!!onClose}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{text}</DialogDescription>
        </DialogHeader>
        <DialogFooter>{actions}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
