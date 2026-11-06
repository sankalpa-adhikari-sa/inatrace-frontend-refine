import { useNotification, useTranslate } from "@refinedev/core";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import type { ApiCompanyUser, ApiUserBase } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { SimpleCombobox, SimpleSelect } from "@/components/app/controls";
import { PageLoader, Section } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useIdentity, useRefreshIdentity } from "@/hooks/use-session";
import { isAdmin } from "@/providers/auth";
import { CompanyTabs } from "./company-tabs";
import { call, useApi, useApiMutation } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { COMPANY_ROLE_ORDER, type CompanyRole, useRoleLabels } from "@/hooks/use-roles";

function useRoles() {
  const { company: label } = useRoleLabels();
  return { label, options: COMPANY_ROLE_ORDER.map((value) => ({ value, label: label[value] })) };
}


export function CompanyUsers() {
  const translate = useTranslate();
  const companyId = Number(useParams().id);
  const { user } = useIdentity();
  const admin = isAdmin(user);
  const [editing, setEditing] = useState<number | "new" | null>(null);

  const {
    data: users = [],
    isLoading,
    refetch,
  } = useApi(ep.getCompanyUsers, { path: { id: companyId } }, { select: (r) => r ?? [] });

  return (
    <>
      <CompanyTabs companyId={companyId} />
      <Section title={translate("companies.titles.usersWithCompanyRoles")}>
        {isLoading ? (
          <PageLoader />
        ) : (
          <ul className="flex flex-col gap-2">
            {users.length === 0 && editing !== "new" && (
              <li className="text-xs text-muted-foreground">{translate("companies.texts.noUsers")}</li>
            )}
            {users.map((u) => (
              <CompanyUserItem
                key={u.id}
                companyId={companyId}
                member={u}
                open={editing === u.id}
                onEdit={() => setEditing(u.id!)}
                onClose={() => setEditing(null)}
                onChanged={refetch}
                canRemove={admin}
              />
            ))}
            {editing === "new" && (
              <CompanyUserItem
                companyId={companyId}
                open
                existing={users.map((u) => u.id!)}
                regional={user?.role === "REGIONAL_ADMIN"}
                onClose={() => setEditing(null)}
                onChanged={refetch}
              />
            )}
          </ul>
        )}
        {admin && editing !== "new" && (
          <Button variant="outline" size="sm" className="self-start" onClick={() => setEditing("new")}>
            <Plus />
            {translate("companies.buttons.addNew")}
          </Button>
        )}
      </Section>
    </>
  );
}

/** CompanyUserRoleComponent: "Name Surname (e-mail), role", opened in place to edit. */
function CompanyUserItem({
  companyId,
  member,
  open,
  existing = [],
  regional = false,
  onEdit,
  onClose,
  onChanged,
  canRemove = false,
}: {
  companyId: number;
  /** Undefined for a new entry. */
  member?: ApiCompanyUser;
  open: boolean;
  existing?: number[];
  regional?: boolean;
  onEdit?: () => void;
  onClose: () => void;
  onChanged: () => void;
  canRemove?: boolean;
}) {
  const translate = useTranslate();
  const roles = useRoles();
  const confirm = useConfirm();
  const { open: notify } = useNotification();
  const { user: me } = useIdentity();
  const refreshIdentity = useRefreshIdentity();
  const isNew = !member;
  const [userId, setUserId] = useState<number | null>(member?.id ?? null);
  const [role, setRole] = useState<CompanyRole | null>(member?.companyRole ?? null);
  const [submitted, setSubmitted] = useState(false);

  const query = { requestType: "FETCH" as const, limit: 1000, sortBy: "name", sort: "ASC" as const };
  const notMember = (r?: { items?: ApiUserBase[] }) => (r?.items ?? []).filter((u) => !existing.includes(u.id!));
  const regionalUsers = useApi(ep.regionalAdminListUsers, { query }, { enabled: isNew && regional, select: notMember });
  const allUsers = useApi(ep.adminListUsers, { query }, { enabled: isNew && !regional, select: notMember });
  const candidates = (regional ? regionalUsers.data : allUsers.data) ?? [];

  const save = useApiMutation({
    mutationFn: async () => {
      if (isNew) {
        await call(ep.executeCompanyAction, {
          path: { action: "ADD_USER_TO_COMPANY" },
          body: { companyId, userId: userId! },
        });
      }
      await call(ep.executeCompanyAction, {
        path: { action: "SET_USER_COMPANY_ROLE" },
        body: { companyId, userId: userId!, companyUserRole: role! },
      });
    },
    onSuccess: async () => {
      onChanged();
      onClose();
      if (userId === me?.id) await refreshIdentity();
    },
  });

  async function remove() {
    if (!member) return;
    const ok = await confirm({
      description: translate("companies.descriptions.removeFromThisCompany", { name: member.name, surname: member.surname }),
      destructive: true,
      confirmLabel: translate("buttons.remove"),
    });
    if (!ok) return;
    await call(ep.executeCompanyAction, {
      path: { action: "REMOVE_USER_FROM_COMPANY" },
      body: { companyId, userId: member.id },
    });
    onChanged();
    notify?.({ type: "success", message: translate("companies.notifications.userRemovedFromCompany") });
    if (member.id === me?.id) await refreshIdentity();
  }

  function submit() {
    setSubmitted(true);
    if (userId == null || role == null) return;
    save.mutate();
  }

  const summary = member && (
    <span className="min-w-0 flex-1 truncate">
      {member.name} {member.surname} <span className="text-muted-foreground">({member.email})</span>,{" "}
      {member.companyRole ? roles.label[member.companyRole] : ""}
    </span>
  );

  if (!open) {
    return (
      <li className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
        <UserRound className="size-4 shrink-0 text-muted-foreground" />
        {summary}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={translate("buttons.edit")}
          onClick={onEdit}
        >
          <Pencil />
        </Button>
        {canRemove && (
          <Button variant="ghost" size="icon-sm" aria-label={translate("buttons.remove")} onClick={remove}>
            <Trash2 />
          </Button>
        )}
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-primary/40 bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field data-invalid={(submitted && userId == null) || undefined}>
          <FieldLabel>{translate("companies.fields.user")}</FieldLabel>
          {isNew ? (
            <SimpleCombobox
              options={candidates.map((u) => ({ value: u.id!, label: `${u.name} ${u.surname} (${u.email})` }))}
              value={userId}
              onChange={setUserId}
              invalid={submitted && userId == null}
              placeholder={translate("companies.placeholders.searchByNameOrE")}
            />
          ) : (
            // The member itself can't be swapped, only its role.
            <div className="flex h-8 items-center rounded-md border bg-muted/50 px-2.5 text-xs">
              {member!.name} {member!.surname} ({member!.email})
            </div>
          )}
          {submitted && userId == null && (
            <FieldError>{translate("companies.errors.userIsRequired")}</FieldError>
          )}
        </Field>
        <Field data-invalid={(submitted && role == null) || undefined}>
          <FieldLabel>{translate("companies.fields.companyRole")}</FieldLabel>
          <SimpleSelect options={roles.options} value={role} onChange={setRole} invalid={submitted && role == null} />
          {submitted && role == null && (
            <FieldError>{translate("companies.errors.roleIsRequired")}</FieldError>
          )}
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose}>
          {translate("buttons.cancel")}
        </Button>
        <Button size="sm" disabled={save.isPending} onClick={submit}>
          {save.isPending && <Spinner />}
          {translate("buttons.save")}
        </Button>
      </div>
    </li>
  );
}
