import { type OnboardingFlow, type OnboardingStep } from "@/stores/onboarding";
import { t } from "@/lib/i18n";

/**
 * Self-onboarding: checklist flows (add a product / facility / processing action
 * / farmers) and the "My stock" guided tour. Each step points at an element
 * marked with `data-onboarding="<target>"`; clicking it advances the flow, or
 * the hint's OK button does (tour).
 */
type Hint = {
  flow: OnboardingFlow;
  step: number;
  target: string;
  title: string;
  /** "2/4" style progress shown under the title. */
  progress?: string;
  /** Step reached by clicking the target. */
  onClick?: OnboardingStep;
  /** OK button: next step and the page to open. */
  ok?: { next: OnboardingStep; to?: string };
};

export const HINTS: Hint[] = [
  {
    flow: "product",
    step: 1,
    target: "nav-products",
    get title() { return t("onboarding.titles.clickHereToAddA"); },
    progress: "1/4",
    onClick: 2,
  },
  {
    flow: "product",
    step: 2,
    target: "new-product",
    get title() { return t("onboarding.titles.clickHereToAddA"); },
    progress: "2/4",
    onClick: 3,
  },
  {
    flow: "product",
    step: 3,
    target: "new-product-submit",
    get title() { return t("onboarding.titles.afterSelectingCompanyAndValue"); },
    progress: "3/4",
    onClick: 4,
  },
  {
    flow: "product",
    step: 4,
    target: "product-create",
    get title() { return t("onboarding.titles.clickCreateAfterAddingAll"); },
    progress: "4/4",
  },

  {
    flow: "facility",
    step: 1,
    target: "nav-company",
    get title() { return t("onboarding.titles.clickHereToAccessYour"); },
    progress: "1/4",
    onClick: 2,
  },
  {
    flow: "facility",
    step: 2,
    target: "tab-facilities",
    get title() { return t("onboarding.titles.clickHereToAccessYourCompanysFacilities"); },
    progress: "2/4",
    onClick: 3,
  },
  {
    flow: "facility",
    step: 3,
    target: "add-facility",
    get title() { return t("onboarding.titles.clickHereToAddAFacility"); },
    progress: "3/4",
    onClick: 4,
  },
  {
    flow: "facility",
    step: 4,
    target: "facility-save",
    get title() { return t("onboarding.titles.clickSaveAfterEnteringThe"); },
    progress: "4/4",
  },

  {
    flow: "processingAction",
    step: 1,
    target: "nav-company",
    get title() { return t("onboarding.titles.clickHereToAccessYour"); },
    progress: "1/4",
    onClick: 2,
  },
  {
    flow: "processingAction",
    step: 2,
    target: "tab-processing-actions",
    get title() { return t("onboarding.titles.clickHereToAccessYourCompanysProcessingActions"); },
    progress: "2/4",
    onClick: 3,
  },
  {
    flow: "processingAction",
    step: 3,
    target: "add-processing-action",
    get title() { return t("onboarding.titles.clickHereToAddAProcessingAction"); },
    progress: "3/4",
    onClick: 4,
  },
  {
    flow: "processingAction",
    step: 4,
    target: "processing-action-save",
    get title() { return t("onboarding.titles.clickSaveAfterEnteringTheProcessingAction"); },
    progress: "4/4",
  },

  {
    flow: "farmers",
    step: 1,
    target: "home-farmers",
    get title() { return t("onboarding.titles.clickHereToAccessThe"); },
    progress: "1/3",
    onClick: 2,
  },
  {
    flow: "farmers",
    step: 2,
    target: "add-farmer",
    get title() { return t("onboarding.titles.clickAddFarmerToAdd"); },
    progress: "2/3",
    onClick: 3,
  },
  {
    flow: "farmers",
    step: 3,
    target: "farmer-save",
    get title() { return t("onboarding.titles.afterEnteringAllTheRequired"); },
    progress: "3/3",
  },

  {
    flow: "tour",
    step: 1,
    target: "home-my-stock",
    get title() { return t("onboarding.titles.thisIsYourMyStock"); },
    ok: { next: 2, to: "/my-stock/deliveries" },
  },
  {
    flow: "tour",
    step: 2,
    target: "stock-deliveries",
    get title() { return t("onboarding.titles.thisIsTheSubmenuForDeliveriesReceivedFrom"); },
    ok: { next: 3 },
  },
  {
    flow: "tour",
    step: 3,
    target: "add-delivery",
    get title() { return t("onboarding.titles.toDocumentADeliveryClick"); },
    ok: { next: 4 },
  },
  {
    flow: "tour",
    step: 4,
    target: "deliveries-list",
    get title() { return t("onboarding.titles.yourRecordedDeliveryWillAppear"); },
    ok: { next: 5, to: "/my-stock/processing" },
  },
  {
    flow: "tour",
    step: 5,
    target: "stock-processing",
    get title() { return t("onboarding.titles.thisIsTheSubmenuForAllProcessingActions"); },
    ok: { next: 6 },
  },
  {
    flow: "tour",
    step: 6,
    target: "processing-facilities",
    get title() { return t("onboarding.titles.pickAFacilityToSee"); },
    ok: { next: 8, to: "/my-stock/payments" },
  },
  {
    flow: "tour",
    step: 8,
    target: "stock-payments",
    get title() { return t("onboarding.titles.thisIsTheSubmenuFor"); },
    ok: { next: 9 },
  },
  {
    flow: "tour",
    step: 9,
    target: "add-payment",
    get title() { return t("onboarding.titles.hereYouAddANew"); },
    ok: { next: 10, to: "/my-stock/all-stock" },
  },
  {
    flow: "tour",
    step: 10,
    target: "stock-all-stock",
    get title() { return t("onboarding.titles.inAllStockYouFind"); },
    ok: { next: 11 },
  },
  {
    flow: "tour",
    step: 11,
    target: "all-stock-facility",
    get title() { return t("onboarding.titles.hereYouSelectTheFacility"); },
    ok: { next: "success", to: "/home" },
  },
];
