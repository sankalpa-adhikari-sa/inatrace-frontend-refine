"use client";

import React from "react";
import { type BaseKey, useCreateButton } from "@refinedev/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

type CreateButtonProps = {
  /**
   * Resource name for API data interactions. `identifier` of the resource can be used instead of the `name` of the resource.
   * @default Inferred resource name from the route
   */
  resource?: BaseKey;
  /**
   * Access Control configuration for the button
   * @default `{ enabled: true, hideIfUnauthorized: false }`
   */
  accessControl?: {
    enabled?: boolean;
    hideIfUnauthorized?: boolean;
  };
  /**
   * `meta` property is used when creating the URL for the related action and path.
   */
  meta?: Record<string, unknown>;
} & React.ComponentProps<typeof Button>;

export const CreateButton = React.forwardRef<
  React.ComponentRef<typeof Button>,
  CreateButtonProps
>(({ resource, accessControl, meta, children, onClick, ...rest }, ref) => {
  const { hidden, disabled, LinkComponent, to, label } = useCreateButton({
    resource,
    accessControl,
    meta,
  });

  const isDisabled = disabled || rest.disabled;
  const isHidden = hidden || rest.hidden;

  if (isHidden) return null;

  return (
    <Button
      {...rest}
      ref={ref}
      disabled={isDisabled}
      nativeButton={false}
      render={
        <LinkComponent
            to={to}
            replace={false}
            onClick={(e: React.MouseEvent<HTMLElement>) => {
              if (isDisabled) {
                e.preventDefault();
                return;
              }
              if (onClick) {
                e.preventDefault();
                onClick(e as Parameters<typeof onClick>[0]);
              }
            }}
        />
      }
    >
        {children ?? (
          <div className="flex items-center gap-2 font-semibold">
            <Plus className="w-4 h-4" />
            <span>{label ?? t("buttons.create")}</span>
          </div>
        )}
    </Button>
  );
});

CreateButton.displayName = "CreateButton";
