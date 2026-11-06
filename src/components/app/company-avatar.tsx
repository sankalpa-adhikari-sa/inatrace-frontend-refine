import { Building2 } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { imageUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * A company's logo as a round avatar, or a building icon when it has none. The resized logo
 * falls back to the original first (images uploaded without resized variants).
 */
export function CompanyAvatar({ company, className }: { company?: { logo?: { storageKey?: string } }; className?: string }) {
  const key = company?.logo?.storageKey;
  const [original, setOriginal] = useState(false);
  return (
    <Avatar className={cn("size-8 border bg-white", className)}>
      {key && (
        <AvatarImage
          src={imageUrl(key, original ? undefined : "SMALL")}
          alt=""
          className="object-contain"
          onLoadingStatusChange={(status) => status === "error" && !original && setOriginal(true)}
        />
      )}
      <AvatarFallback className="bg-white">
        <Building2 className="size-[45%] text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
}
