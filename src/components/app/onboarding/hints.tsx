import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/stores/onboarding";
import { useTranslate } from "@refinedev/core";
import { HINTS } from "./hint-steps";

const selector = (target: string) => `[data-onboarding="${target}"]`;

/** Finds the hint's target element once it is rendered. */
function useTargetElement(target?: string) {
  const [el, setEl] = useState<Element | null>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    if (!target) return setEl(null);
    const find = () => {
      const found = document.querySelector(selector(target));
      setEl((prev) => (prev === found ? prev : found));
    };
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [target, pathname]);
  return el;
}

/** The active step's hint, anchored to its target. Mounted once in the app layout. */
export function OnboardingHints() {
  const translate = useTranslate();
  const state = useOnboarding();
  const navigate = useNavigate();
  const hint = HINTS.find((h) => state[h.flow] === h.step);
  const anchor = useTargetElement(hint?.target);

  // Clicking the highlighted element advances click-driven steps.
  useEffect(() => {
    if (!hint || hint.onClick === undefined) return;
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.(selector(hint.target))) state.set(hint.flow, hint.onClick!);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [hint, state]);

  if (!hint || !anchor) return null;

  return (
    <PopoverPrimitive.Root open modal={false}>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          anchor={anchor}
          side="bottom"
          align="start"
          sideOffset={8}
          className="isolate z-50"
        >
          <PopoverPrimitive.Popup
            initialFocus={false}
            className="flex w-72 flex-col gap-2 rounded-lg bg-primary p-3 text-xs text-primary-foreground shadow-lg"
          >
            <div className="flex items-start gap-2">
              <p className="flex-1 font-medium">{hint.title}</p>
              <button
                type="button"
                aria-label={translate("onboarding.buttons.stopTheGuide")}
                className="opacity-70 hover:opacity-100"
                onClick={() => state.set(hint.flow, null)}
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              {hint.progress ? (
                <span className="opacity-80">
                  {translate("onboarding.texts.step", { progress: hint.progress })}
                </span>
              ) : (
                <span />
              )}
              {hint.ok && (
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => {
                    state.set(hint.flow, hint.ok!.next);
                    if (hint.ok!.to) navigate(hint.ok!.to);
                  }}
                >
                  {translate("buttons.ok")}
                </Button>
              )}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
