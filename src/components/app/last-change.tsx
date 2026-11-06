import { useTranslate } from "@refinedev/core";
import { History } from "lucide-react";
import type { ApiUser } from "@/client/types.gen";

const fullName = (u?: ApiUser) => [u?.name, u?.surname].filter(Boolean).join(" ");

/** "<user> updated <d.m.yyyy> at <H:mm>" (LastSeenTagComponent). Renders nothing without a timestamp. */
export function LastChange({ user, timestamp }: { user?: ApiUser; timestamp?: string }) {
  const translate = useTranslate();
  if (!timestamp) return null;
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return null;
  const date = `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <History className="size-3.5" />
      {translate("common.texts.updatedAt", { user: fullName(user), date, time }).trim()}
    </span>
  );
}
