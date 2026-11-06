import { create } from "zustand";


export type OnboardingFlow = "product" | "facility" | "processingAction" | "farmers" | "tour";
export type OnboardingStep = number | "success" | null;

type OnboardingState = Record<OnboardingFlow, OnboardingStep> & {
  set: (flow: OnboardingFlow, step: OnboardingStep) => void;
};

export const useOnboarding = create<OnboardingState>((set) => ({
  product: null,
  facility: null,
  processingAction: null,
  farmers: null,
  tour: null,
  set: (flow, step) => set({ [flow]: step }),
}));

/** Last step of each checklist flow; saving there completes the flow. */
const FINAL_STEP: Partial<Record<OnboardingFlow, number>> = { product: 4, facility: 4, processingAction: 4, farmers: 3 };

/**
 * Call after a successful save. Returns true when it completed the flow; the
 * caller then navigates home, where the success dialog appears.
 */
export function completeOnboarding(flow: OnboardingFlow) {
  const { [flow]: step, set } = useOnboarding.getState();
  if (step == null || step !== FINAL_STEP[flow]) return false;
  set(flow, "success");
  return true;
}
