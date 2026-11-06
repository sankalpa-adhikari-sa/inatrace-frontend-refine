import { env } from "./env";


export const CONSENT_KEYS = {
  GA: "cookieConsentGoogleAnalytics",
  FB: "cookieConsentFacebookPixel",
  INTERCOM: "cookieConsentIntercom",
  ROCKET: "cookieConsentRocket",
} as const;

export type ConsentType = keyof typeof CONSENT_KEYS;

/** Cookie types the banner asks about in this deployment. */
export function activeConsents(): ConsentType[] {
  const types: ConsentType[] = ["GA", "FB"];
  if (env.chatApp === "intercom") types.push("INTERCOM");
  if (env.chatApp === "rocket") types.push("ROCKET");
  return types;
}

/** true / false once decided, null while undecided. */
export function getConsent(type: ConsentType): boolean | null {
  try {
    const value = JSON.parse(localStorage.getItem(CONSENT_KEYS[type]) ?? "null");
    return typeof value === "boolean" ? value : null;
  } catch {
    return null;
  }
}

export function setConsent(type: ConsentType, value: boolean | null) {
  try {
    if (value == null) localStorage.removeItem(CONSENT_KEYS[type]);
    else localStorage.setItem(CONSENT_KEYS[type], JSON.stringify(value));
  } catch {
    // storage unavailable
  }
}

export const hasDecidedAll = () => activeConsents().every((t) => getConsent(t) != null);

/** Whether this deployment loads anything that needs consent. */
export const needsConsent = () => !!env.googleAnalyticsId || env.chatApp === "rocket";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    RocketChat?: ((c: unknown) => void) & { _: unknown[]; url: string };
  }
}

let gaLoaded = false;
function loadGoogleAnalytics(id: string) {
  if (gaLoaded || !id) return;
  gaLoaded = true;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // gtag expects the arguments object itself.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  // Page views are sent on route changes (trackPageView).
  window.gtag("config", id, { send_page_view: false });
}

let rocketLoaded = false;
function loadRocketChat(server: string) {
  if (rocketLoaded || !server) return;
  rocketLoaded = true;
  const rc = Object.assign((c: unknown) => rc._.push(c), { _: [] as unknown[], url: server });
  window.RocketChat = rc;
  const script = document.createElement("script");
  script.async = true;
  script.src = `${server}/rocketchat-livechat.min.js?_=201903270000`;
  document.head.appendChild(script);
}

export function loadConsented() {
  if (getConsent("GA")) loadGoogleAnalytics(env.googleAnalyticsId);
  if (env.chatApp === "rocket" && getConsent("ROCKET")) loadRocketChat(env.rocketChatServer);
}

export function trackPageView(path: string) {
  if (!gaLoaded || !window.gtag) return;
  window.gtag("event", "page_view", { page_path: path, page_location: window.location.href });
}
