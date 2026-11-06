import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { CONSENT_KEYS, type ConsentType, activeConsents, setConsent } from "@/lib/consent";
import { env } from "@/lib/env";

/**
 * `/s/clear-cookies/:type/:value` (ClearCookieConsentComponent): sets or clears
 * one consent (or ALL), then returns to the cookie policy.
 */
export function ClearCookieConsentPage() {
  const { type = "", value = "" } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    // CHAT means whichever chat app this deployment uses.
    const chat: ConsentType | null =
      env.chatApp === "rocket" ? "ROCKET" : env.chatApp === "intercom" ? "INTERCOM" : null;
    const types: ConsentType[] =
      type === "ALL"
        ? activeConsents()
        : type === "CHAT"
        ? chat
          ? [chat]
          : []
        : type in CONSENT_KEYS
        ? [type as ConsentType]
        : [];
    if (["true", "false", "null"].includes(value)) {
      for (const t of types) setConsent(t, JSON.parse(value) as boolean | null);
    }
    navigate("/s/cookies", { replace: true });
  }, [type, value, navigate]);
  return null;
}
