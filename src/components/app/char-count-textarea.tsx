import type { ComponentProps } from "react";
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupTextarea } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

/**
 * Textarea with a live "used / max" character count under it (shadcn input group).
 * The count turns red past `maxLength`; the limit itself is enforced by validation,
 * so pasted text isn't silently cut off.
 */
export function CharCountTextarea({
  maxLength,
  value,
  className,
  ...props
}: Omit<ComponentProps<"textarea">, "maxLength" | "value"> & { maxLength: number; value?: string }) {
  const used = value?.length ?? 0;
  const over = used > maxLength;
  return (
    <InputGroup className={className}>
      <InputGroupTextarea value={value ?? ""} {...props} />
      <InputGroupAddon align="block-end" className="justify-end">
        <InputGroupText className={cn("tabular-nums", over && "font-medium text-destructive")} aria-live="polite">
          {used} / {maxLength}
        </InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}
