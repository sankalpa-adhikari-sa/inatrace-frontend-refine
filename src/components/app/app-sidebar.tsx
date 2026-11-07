import {
  BarChart3,
  ChevronRight,
  Boxes,
  Building2,
  Coins,
  Home,
  Link2,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tractor,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useIdentity, useSelectedCompany } from "@/hooks/use-session";
import { canManageCompany, isAdmin } from "@/providers/auth";
import { useTranslate } from "@refinedev/core";

type NavItem = {
  label: string;
  /** Self-onboarding target name. */
  onboarding?: string;
  to: string;
  icon: ReactNode;
  /** Extra path prefixes that should mark this item active. */
  match?: string[];
  hidden?: boolean;
};

type NavGroup = { label: string; items: NavItem[]; hidden?: boolean };

type NavEntry =
  | { kind: "link"; item: NavItem; restricted?: boolean }
  | { kind: "section"; label: string; icon: ReactNode; items: NavItem[] };

export function AppSidebar() {
  const translate = useTranslate();
  const { user } = useIdentity();
  const { company, companyId } = useSelectedCompany();
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();

  // The mobile sidebar is a sheet over the page: close it once a link has been followed.
  useEffect(() => setOpenMobile(false), [pathname, setOpenMobile]);

  const activeUser = user?.status === "ACTIVE";
  const companyAdmin = canManageCompany(user, companyId ?? undefined);

  const groups: NavGroup[] = [
    {
      label: translate("common.fields.company"),
      hidden: !companyId,
      items: [
        { label: translate("common.fields.myStock"), to: "/my-stock", icon: <Boxes /> },
        { label: translate("common.fields.orders"), to: "/my-orders", icon: <ShoppingCart /> },
        {
          label: translate("common.fields.farmers"),
          to: "/my-farmers",
          icon: <Tractor />,
        },
        {
          label: translate("common.fields.collectors"),
          to: "/my-collectors",
          icon: <Truck />,
          hidden: !company?.supportsCollectors,
        },
        {
          label: translate("common.fields.myCustomers"),
          to: "/my-customers",
          icon: <Store />,
          hidden: !company?.companyRoles?.includes("BUYER"),
        },
        {
          label: translate("common.fields.dashboard"),
          to: "/company-dashboard",
          icon: <BarChart3 />,
        },
        {
          label: translate("common.fields.companySettings"),
          to: `/companies/${companyId}`,
          onboarding: "nav-company",
          icon: <Building2 />,
          hidden: !companyAdmin,
        },
      ],
    },
    {
      label: translate("common.fields.products"),
      items: [
        {
          label: translate("common.fields.products"),
          to: "/product-labels",
          icon: <Package />,
          onboarding: "nav-products",
        },
      ],
    },
    {
      label: translate("common.fields.system"),
      hidden: !isAdmin(user),
      items: [
        // Company settings of the selected company also live under /companies.
        { label: translate("common.fields.companies"), to: "/companies", icon: <Building2 /> },
        { label: translate("common.fields.users"), to: "/users", icon: <Users /> },
        { label: translate("common.fields.settings"), to: "/settings", icon: <Settings /> },
        {
          label: translate("common.fields.valueChains"),
          to: "/value-chains",
          icon: <Link2 />,
        },
        { label: translate("common.fields.currencies"), to: "/currencies", icon: <Coins /> },
      ],
    },
  ];

  const isActive = (item: NavItem) =>
    [item.to, ...(item.match ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const home: NavItem = { label: translate("common.fields.home"), to: "/home", icon: <Home /> };
  const profile: NavItem = { label: translate("common.fields.myProfile"), to: "/user-profile", icon: <UserCog /> };
  const section = (g: NavGroup, icon: ReactNode): NavEntry | null =>
    g.hidden ? null : { kind: "section", label: g.label, icon, items: g.items.filter((i) => !i.hidden) };

  // Blocks are separated by a divider: personal, company work, system admin.
  const blocks: NavEntry[][] = (
    [
      [
        { kind: "link", item: home },
        { kind: "link", item: profile },
      ],
      [
        section(groups[0], <Building2 />),
        ...groups[1].items.map((item): NavEntry => ({ kind: "link", item, restricted: true })),
      ],
      [section(groups[2], <ShieldCheck />)],
    ] satisfies (NavEntry | null)[][]
  )
    .map((block) => block.filter((e): e is NavEntry => e !== null))
    .filter((block) => block.length > 0);
  // Longest matching route wins, so "/companies/5" highlights company settings
  // rather than the system "Companies" list.
  const visible = blocks.flat().flatMap((e) => (e.kind === "link" ? [e.item] : e.items));
  const activeTo = visible.filter(isActive).sort((a, b) => b.to.length - a.to.length)[0]?.to;

  return (
    <Sidebar collapsible="icon">
      {/* Same height as the app header so their bottom edges line up. */}
      <SidebarHeader className="h-12 justify-center py-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-9 hover:bg-transparent" render={<Link to="/home" />}>
              <img src="/logo-INA.png" alt="" className="size-6 rounded-sm object-contain" />
              <span className="font-heading text-xl font-medium text-secondary">{translate("common.texts.inaTrace")}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {blocks.map((block, i) => (
          <Fragment key={i}>
            {i > 0 && <SidebarSeparator className="mx-4 group-data-[collapsible=icon]:mx-3" />}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {block.map((entry) =>
                    entry.kind === "section" ? (
                      <NavSection
                        key={entry.label}
                        label={entry.label}
                        icon={entry.icon}
                        items={entry.items}
                        activeTo={activeTo}
                        disabled={!activeUser}
                      />
                    ) : (
                      <SidebarMenuItem key={entry.item.to}>
                        <SidebarMenuButton
                          tooltip={entry.item.label}
                          isActive={entry.item.to === activeTo}
                          disabled={entry.restricted && !activeUser}
                          render={entry.restricted && !activeUser ? undefined : <Link to={entry.item.to} />}
                          data-onboarding={entry.item.onboarding}
                        >
                          {entry.item.icon}
                          <span>{entry.item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ),
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </Fragment>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

/** A collapsible parent with indented children; a dropdown when the sidebar is collapsed to icons. */
function NavSection({
  label,
  icon,
  items,
  activeTo,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  items: NavItem[];
  activeTo?: string;
  disabled: boolean;
}) {
  const { state, isMobile } = useSidebar();
  const containsActive = items.some((i) => i.to === activeTo);
  const [userOpen, setUserOpen] = useState<boolean>();
  // Follow the route until the user toggles it themselves.
  const open = userOpen ?? containsActive;
  const parentClass = cn(containsActive && "text-sidebar-primary hover:text-sidebar-primary");

  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarMenuItem data-section-active={containsActive || undefined}>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton tooltip={label} className={parentClass} />}>
            {icon}
            <span>{label}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" className="min-w-44">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{label}</DropdownMenuLabel>
              {items.map((item) => (
                <DropdownMenuItem
                  key={item.to}
                  disabled={disabled}
                  render={<Link to={item.to} />}
                  className={cn(item.to === activeTo && "bg-accent font-medium")}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setUserOpen} render={<SidebarMenuItem />} data-section-active={containsActive || undefined}>
      <CollapsibleTrigger render={<SidebarMenuButton tooltip={label} className={parentClass} />}>
        {icon}
        <span>{label}</span>
        <ChevronRight className="ml-auto text-muted-foreground transition-transform duration-200 group-data-panel-open/menu-button:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub className="mx-0 mt-0.5 ml-6 translate-x-0 border-l-0 px-0">
          {items.map((item) => (
            <SidebarMenuSubItem key={item.to}>
              <SidebarMenuSubButton
                isActive={item.to === activeTo}
                aria-disabled={disabled || undefined}
                render={disabled ? <span /> : <Link to={item.to} />}
                data-onboarding={item.onboarding}
                className="h-8 data-active:font-medium"
              >
                <span>{item.label}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}
