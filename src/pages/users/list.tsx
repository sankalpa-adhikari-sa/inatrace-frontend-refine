import { useNotification, useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { ApiUserBase, ApiUserGet } from "@/client/types.gen";
import {
  type RowAction,
  RowActions,
  SearchInput,
  SimpleSelect,
  StatusBadge,
  Toolbar,
  humanize,
} from "@/components/app/controls";
import { PageHeader } from "@/components/app/page";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { SortableHeader } from "@/components/refine-ui/data-table/data-table-sorter";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useIdentity } from "@/hooks/use-session";
import { useTableFilter } from "@/hooks/use-table-filter";
import { call } from "@/lib/http";
import { ep } from "@/lib/endpoints";

type UserAction = NonNullable<ApiUserGet["actions"]>[number];

const STATUS_OPTIONS = ["ACTIVE", "DEACTIVATED", "CONFIRMED_EMAIL", "UNCONFIRMED"].map((v) => ({ value: v, get label() { return humanize(v); } }));
const ROLE_OPTIONS = ["SYSTEM_ADMIN", "REGIONAL_ADMIN", "USER"].map((v) => ({ value: v, get label() { return humanize(v); } }));

export function UserList() {
  const translate = useTranslate();
  const { user: me } = useIdentity();
  const navigate = useNavigate();
  const { open: notify } = useNotification();
  const isSystemAdmin = me?.role === "SYSTEM_ADMIN";
  const isRegionalAdmin = me?.role === "REGIONAL_ADMIN";
  // System admins see "my users" by default and can widen to all users.
  const [mineOnly, setMineOnly] = useState(true);

  const columns = useMemo<ColumnDef<ApiUserBase>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        meta: { primary: true },
        header: ({ column }) => <SortableHeader column={column} label={translate("common.fields.name")} />,
      },
      {
        id: "surname",
        accessorKey: "surname",
        header: ({ column }) => <SortableHeader column={column} label={translate("users.fields.surname")} />,
      },
      {
        id: "email",
        accessorKey: "email",
        header: ({ column }) => <SortableHeader column={column} label={translate("common.fields.eMail")} />,
      },
      {
        id: "role",
        accessorKey: "role",
        header: translate("users.fields.role"),
        enableSorting: false,
        cell: ({ getValue }) => humanize(getValue<string>()),
      },
      {
        id: "status",
        accessorKey: "status",
        header: translate("common.fields.status"),
        enableSorting: false,
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => <Actions user={row.original} />,
      },
    ],
    // Actions closes over me/navigate; recreated when the identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [me?.id]
  );

  const table = useTable<ApiUserBase>({
    columns,
    refineCoreProps: {
      resource: "users",
      meta: { scope: isRegionalAdmin ? "regional" : isSystemAdmin && !mineOnly ? "all" : "mine" },
      sorters: { initial: [{ field: "name", order: "asc" }] },
      syncWithLocation: true,
    },
  });

  const [status, setStatus] = useTableFilter(table, "status");
  const [role, setRole] = useTableFilter(table, "role");
  const [query, setQuery] = useTableFilter(table, "query");

  async function execute(user: ApiUserBase, action: UserAction, error: string) {
    try {
      await call(ep.activateUser, { path: { action }, body: { id: user.id } });
      table.refineCore.tableQuery.refetch();
    } catch {
      notify?.({
        type: "error",
        message: translate("users.notifications.error"),
        description: error,
      });
    }
  }

  function Actions({ user }: { user: ApiUserBase }) {
    const translate = useTranslate();
    const active = user.status === "ACTIVE";
    const actions: RowAction[] = [
      {
        label: translate("common.fields.edit"),
        onClick: () => navigate(`/users/${user.id}`),
      },
      {
        label: translate("users.fields.activate"),
        hidden: user.status === "UNCONFIRMED" || active,
        onClick: () => execute(user, "ACTIVATE_USER", translate("users.notifications.cannotActivateTheUser")),
      },
      {
        label: translate("users.fields.deactivate"),
        destructive: true,
        hidden: user.status === "UNCONFIRMED" || user.status === "DEACTIVATED",
        onClick: () => execute(user, "DEACTIVATE_USER", translate("users.notifications.cannotDeactivateTheUser")),
      },
      {
        label: translate("users.fields.setSystemAdmin"),
        separatorBefore: true,
        hidden: !isSystemAdmin || !active || user.role !== "USER",
        onClick: () => execute(user, "SET_USER_SYSTEM_ADMIN", translate("users.notifications.cannotChangeUserRole")),
      },
      {
        label: translate("users.fields.setRegionalAdmin"),
        hidden: !isSystemAdmin || !active || user.role !== "USER",
        onClick: () => execute(user, "SET_USER_REGIONAL_ADMIN", translate("users.notifications.cannotChangeUserRole")),
      },
      {
        label: translate("users.fields.unsetSystemAdmin"),
        separatorBefore: true,
        hidden: !isSystemAdmin || !active || user.role !== "SYSTEM_ADMIN",
        onClick: () => execute(user, "UNSET_USER_SYSTEM_ADMIN", translate("users.notifications.cannotChangeUserRole")),
      },
      {
        label: translate("users.fields.unsetRegionalAdmin"),
        separatorBefore: true,
        hidden: !isSystemAdmin || !active || user.role !== "REGIONAL_ADMIN",
        onClick: () => execute(user, "UNSET_USER_REGIONAL_ADMIN", translate("users.notifications.cannotChangeUserRole")),
      },
    ];
    return <RowActions actions={actions} />;
  }

  return (
    <>
      <PageHeader
        title={translate("users.titles.users")}
        description={translate("users.descriptions.listOfUsersTotal", { total: table.refineCore.result.total ?? 0 })}
      />
      <Toolbar>
        <SearchInput
          value={(query as string) ?? ""}
          onChange={setQuery}
          placeholder={translate("users.placeholders.searchByNameOrE")}
        />
        <SimpleSelect
          className="sm:w-48"
          options={[{ value: "", label: translate("common.fields.allStatuses") }, ...STATUS_OPTIONS]}
          value={(status as string) ?? ""}
          onChange={setStatus}
          placeholder={translate("users.placeholders.allStatuses")}
        />
        <SimpleSelect
          className="sm:w-48"
          options={[{ value: "", label: translate("users.fields.allRoles") }, ...ROLE_OPTIONS]}
          value={(role as string) ?? ""}
          onChange={setRole}
          placeholder={translate("users.placeholders.allRoles")}
        />
        {isSystemAdmin && (
          <div className="flex items-center gap-2">
            <Switch id="my-users" checked={mineOnly} onCheckedChange={setMineOnly} />
            <Label htmlFor="my-users">{translate("users.fields.myUsersOnly")}</Label>
          </div>
        )}
      </Toolbar>
      <DataTable table={table} getRowHref={(u) => `/users/${u.id}`} />
    </>
  );
}
