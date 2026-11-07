import { useLogout, useTranslate } from "@refinedev/core";
import { Building2, ChevronsUpDown, LogOut, ShieldCheck, UserCog } from "lucide-react";
import { useNavigate } from "react-router";
import { ThemeToggle } from "@/components/refine-ui/theme/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRoleLabels } from "@/hooks/use-roles";
import { useIdentity, useSelectedCompany } from "@/hooks/use-session";
import { isAdmin } from "@/providers/auth";
import { CompanyAvatar } from "./company-avatar";
import { LANGUAGE_OPTIONS, LanguageSelect, useChangeLanguage } from "./language-select";
import { useCompanyPicker } from "./company-picker";

export function AppHeader() {
  const translate = useTranslate();
  const { user } = useIdentity();
  const { company } = useSelectedCompany();
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();
  const openCompanyPicker = useCompanyPicker();
  const roles = useRoleLabels();
  const language = useChangeLanguage();

  const initials = `${user?.name?.[0] ?? ""}${user?.surname?.[0] ?? ""}`.toUpperCase();
  const hasManyCompanies = (user?.companyIds?.length ?? 0) > 1;
  // Role in the selected company; system / regional admins may see a company they aren't a member of.
  const companyRole = company?.users?.find((u) => u.id === user?.id)?.companyRole;
  const companyRoleLabel = companyRole ? roles.company[companyRole] : undefined;
  const systemRoleLabel = isAdmin(user) && user?.role ? roles.system[user.role] : undefined;

  const companyInfo = company && (
    <>
      <CompanyAvatar company={company} className="size-7" />
      <span className="flex min-w-0 flex-col items-start leading-tight">
        <span className="max-w-56 truncate text-[0.8125rem] font-medium">{company.name}</span>
        {(companyRoleLabel || company.users) && (
          <span className="text-[0.6875rem] text-muted-foreground">
            {companyRoleLabel ?? translate("common.texts.notAMemberOfThis")}
          </span>
        )}
      </span>
    </>
  );

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b border-sidebar-border bg-card px-3">
      <SidebarTrigger className="size-8 text-muted-foreground hover:text-foreground [&_svg]:size-4" />
      <Separator orientation="vertical" className="mx-1 h-5 data-[orientation=vertical]:self-center" />
      {company &&
        (hasManyCompanies ? (
          <Button
            variant="ghost"
            className="h-9 gap-2 px-1.5"
            onClick={openCompanyPicker}
            title={translate("common.titles.switchCompany")}
          >
            {companyInfo}
            <ChevronsUpDown className="opacity-60" />
          </Button>
        ) : (
          // A single company can't be switched, so it's shown plainly rather than as a disabled button.
          <div className="flex min-w-0 items-center gap-2 px-2">{companyInfo}</div>
        ))}
      <div className="ml-auto flex items-center gap-1">
        {systemRoleLabel && (
          <Badge
            variant="secondary"
            className="mr-2 hidden h-6 gap-1 border-secondary/20 bg-secondary/10 px-2 font-medium text-secondary-strong sm:inline-flex"
          >
            <ShieldCheck />
            {systemRoleLabel}
          </Badge>
        )}
        <LanguageSelect className="mr-1 hidden sm:block" />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon-lg" className="rounded-full" title={translate("common.titles.account")} />}
          >
            <Avatar className="size-7">
              <AvatarFallback className="text-[0.7rem] font-medium">{initials || "?"}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="font-medium text-foreground">
                  {user?.name} {user?.surname}
                </div>
                <div className="truncate font-normal">{user?.email}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {/* The header's language picker is hidden on phones; offer it here instead. */}
            <DropdownMenuGroup className="sm:hidden">
              <DropdownMenuLabel>{translate("common.fields.language")}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={language.locale}
                onValueChange={(v) => language.change(v as typeof language.locale)}
              >
                {LANGUAGE_OPTIONS.map((o) => (
                  <DropdownMenuRadioItem key={o.value} value={o.value} disabled={language.pending}>
                    {o.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
            </DropdownMenuGroup>
            <DropdownMenuItem onClick={() => navigate("/user-profile")}>
              <UserCog />
              {translate("buttons.myProfile")}
            </DropdownMenuItem>
            {hasManyCompanies && (
              <DropdownMenuItem onClick={openCompanyPicker}>
                <Building2 />
                {translate("buttons.switchCompany")}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => logout()}>
              <LogOut />
              {translate("buttons.logOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
