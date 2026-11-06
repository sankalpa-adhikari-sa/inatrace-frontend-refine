"use client";

import { useTheme } from "@/components/refine-ui/theme/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTranslate } from "@refinedev/core";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const translate = useTranslate();
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    switch (theme) {
      case "light":
        setTheme("dark");
        break;
      case "dark":
        setTheme("system");
        break;
      case "system":
        setTheme("light");
        break;
      default:
        setTheme("light");
    }
  };

  const label = translate("common.fields.toggleThemeLightDarkSystem");
  const icon = "absolute size-4 transition-all duration-200";

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={cycleTheme}
      title={label}
      className={cn("relative text-muted-foreground hover:text-foreground", className)}
    >
      <Sun className={cn(icon, theme !== "dark" && theme !== "system" ? "scale-100 rotate-0" : "scale-0 -rotate-90")} />
      <Moon className={cn(icon, theme === "dark" ? "scale-100 rotate-0" : "scale-0 rotate-90")} />
      <Monitor className={cn(icon, theme === "system" ? "scale-100" : "scale-0")} />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

ThemeToggle.displayName = "ThemeToggle";
