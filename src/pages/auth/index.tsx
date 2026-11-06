import { useForgotPassword, useLogin, useRegister, useUpdatePassword, useTranslate } from "@refinedev/core";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, MailCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { CheckboxField, EMAIL_PATTERN, TextField } from "@/components/app/form-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { call } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { safeRedirect } from "@/lib/safe-redirect";

export function LoginPage() {
  const translate = useTranslate();
  const { mutate: login, isPending } = useLogin();
  const [params, setParams] = useSearchParams();
  const { control, handleSubmit } = useForm({ defaultValues: { email: "", password: "" } });

  // Refine's useLogin navigates to the URL's `?to=` itself, ahead of the redirect `login()` returns;
  // drop a `to` that leaves the app (see safeRedirect) so a crafted link falls back to /home.
  const to = params.get("to");
  useEffect(() => {
    if (to && safeRedirect(to, "") === "") {
      setParams((p) => {
        p.delete("to");
        return p;
      }, { replace: true });
    }
  }, [to, setParams]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{translate("auth.titles.welcomeBack")}</CardTitle>
        <CardDescription>{translate("auth.descriptions.signInToContinue")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit((v) => login({ ...v, redirectTo: params.get("to") ?? undefined }))}>
        <CardContent>
          <FieldGroup>
            <TextField
              control={control}
              name="email"
              label={translate("auth.fields.username")}
              placeholder={translate("auth.placeholders.enterYourUsername")}
              autoComplete="username"
              rules={{
                required: translate("auth.errors.usernameIsRequired"),
                pattern: {
                  ...EMAIL_PATTERN,
                  message: translate("auth.errors.usernameIsInTheWrong"),
                },
              }}
            />
            <TextField
              control={control}
              name="password"
              type="password"
              label={translate("auth.fields.password")}
              placeholder={translate("auth.placeholders.enterYourPassword")}
              autoComplete="current-password"
              rules={{ required: translate("auth.errors.passwordIsRequired") }}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-4 flex-col gap-3">
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending && <Spinner />}
            {translate("auth.buttons.login")}
          </Button>
          <div className="flex w-full justify-between text-xs">
            <Link to="/reset-password" className="text-muted-foreground hover:text-foreground">
              {translate("auth.buttons.forgotPassword")}
            </Link>
            <Link to="/register" className="text-muted-foreground hover:text-foreground">
              {translate("auth.buttons.createAnAccount")}
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

export function RegisterPage() {
  const translate = useTranslate();
  const { mutate: register, isPending } = useRegister();
  const { control, handleSubmit } = useForm({
    defaultValues: { name: "", surname: "", email: "", password: "", condition: false },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{translate("auth.titles.createAnAccount")}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(({ condition: _condition, ...v }) => register(v))}>
        <CardContent>
          <FieldGroup>
            <TextField
              control={control}
              name="name"
              label={translate("common.fields.firstName")}
              placeholder={translate("auth.placeholders.enterYourFirstName")}
              rules={{ required: translate("common.errors.firstNameIsRequired") }}
            />
            <TextField
              control={control}
              name="surname"
              label={translate("common.fields.lastName")}
              placeholder={translate("auth.placeholders.enterYourLastName")}
              rules={{ required: translate("common.errors.lastNameIsRequired") }}
            />
            <TextField
              control={control}
              name="email"
              type="email"
              label={translate("common.fields.eMail")}
              placeholder={translate("auth.placeholders.enterYourEMail")}
              autoComplete="email"
              rules={{
                required: translate("auth.errors.eMailIsRequired"),
                pattern: EMAIL_PATTERN,
              }}
            />
            <TextField
              control={control}
              name="password"
              type="password"
              label={translate("auth.fields.password")}
              placeholder={translate("auth.placeholders.enterYourPassword")}
              autoComplete="new-password"
              rules={{
                required: translate("auth.errors.passwordMustContainAtLeast"),
                minLength: {
                  value: 8,
                  message: translate("auth.errors.passwordMustContainAtLeast"),
                },
              }}
            />
            <CheckboxField
              control={control}
              name="condition"
              label={
                <span>
                  {translate("auth.fields.yesIAgreeWith")}{" "}
                  <Link to="/s/terms-and-conditions" target="_blank" className="underline">
                    {translate("auth.fields.yourConditions")}
                  </Link>
                </span>
              }
              rules={{ validate: (v) => v === true || translate("auth.errors.youHaveToAgreeWith") }}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-4 flex-col gap-3">
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending && <Spinner />}
            {translate("auth.buttons.register")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {translate("auth.texts.alreadyRegistered")}{" "}
            <Link to="/login" className="text-foreground underline">
              {translate("auth.buttons.login")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export function AccountActivationPage() {
  const translate = useTranslate();
  return (
    <Card>
      <CardHeader>
        <MailCheck className="size-6 text-muted-foreground" />
        <CardTitle className="text-base">
          {translate("auth.titles.activationOfUserAccount")}
        </CardTitle>
        <CardDescription className="flex flex-col gap-2">
          <span>
            {translate("auth.texts.emailVerificationWasSentTo")}
          </span>
          <span>
            {translate("auth.texts.afterEmailVerificationWeWill")}
          </span>
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button className="w-full" size="lg" render={<Link to="/login" />} nativeButton={false}>
          {translate("auth.buttons.goToLogIn")}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function ResetPasswordRequestPage() {
  const translate = useTranslate();
  const { mutate: forgotPassword, isPending } = useForgotPassword();
  const [sent, setSent] = useState(false);
  const { control, handleSubmit } = useForm({ defaultValues: { email: "" } });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{translate("auth.titles.resetPassword")}</CardTitle>
        <CardDescription>
          {translate("auth.descriptions.enterTheEmailAddressAssociated")}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit((v) => forgotPassword(v, { onSuccess: (r) => r.success && setSent(true) }))}>
        <CardContent>
          {sent ? (
            <p className="flex gap-2 rounded-md bg-muted p-3 text-xs">
              <CheckCircle2 className="size-4 shrink-0" />
              {translate("auth.texts.ifAUserWithThis")}
            </p>
          ) : (
            <TextField
              control={control}
              name="email"
              type="email"
              label={translate("auth.fields.email")}
              placeholder={translate("auth.placeholders.enterYourEmail")}
              rules={{
                required: translate("auth.errors.emailCannotBeEmpty"),
                pattern: { ...EMAIL_PATTERN, message: translate("auth.errors.emailIsInTheWrong") },
              }}
            />
          )}
        </CardContent>
        <CardFooter className="mt-4 flex-col gap-3">
          {!sent && (
            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending && <Spinner />}
              {translate("auth.buttons.resetPassword")}
            </Button>
          )}
          <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
            {translate("auth.buttons.backToLogin")}
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

export function ResetPasswordPage() {
  const translate = useTranslate();
  const { token } = useParams();
  const { mutate: updatePassword, isPending } = useUpdatePassword();
  const { control, handleSubmit, getValues } = useForm({ defaultValues: { password: "", confirmPassword: "" } });
  const minLength = {
    value: 8,
    message: translate("auth.errors.passwordShouldContainAtLeast"),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{translate("auth.titles.resetPassword")}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit((v) => updatePassword({ token, password: v.password }))}>
        <CardContent>
          <FieldGroup>
            <TextField
              control={control}
              name="password"
              type="password"
              label={translate("auth.fields.password")}
              placeholder={translate("auth.placeholders.enterNewPassword")}
              autoComplete="new-password"
              rules={{ required: minLength.message, minLength }}
            />
            <TextField
              control={control}
              name="confirmPassword"
              type="password"
              label={translate("auth.fields.confirmPassword")}
              placeholder={translate("auth.placeholders.confirmPassword")}
              autoComplete="new-password"
              rules={{
                required: minLength.message,
                minLength,
                validate: (v) => v === getValues("password") || translate("auth.errors.passwordsDoNotMatch"),
              }}
            />
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-4 flex-col gap-3">
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending && <Spinner />}
            {translate("auth.buttons.resetPassword")}
          </Button>
          <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">
            {translate("auth.buttons.backToLogin")}
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}

export function ConfirmEmailPage() {
  const translate = useTranslate();
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const started = useRef(false);
  const { mutate, isError } = useMutation({
    mutationFn: () => call(ep.confirmEmail, { body: { token: encodeURIComponent(token) } }),
    onSuccess: () => navigate("/login"),
  });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate();
  }, [mutate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {!isError && <Spinner />}
          {isError ? translate("auth.titles.emailCouldNotBeConfirmed") : translate("auth.titles.confirmingEmail")}
        </CardTitle>
        {isError && <CardDescription>{translate("auth.descriptions.theConfirmationLinkIsInvalid")}</CardDescription>}
      </CardHeader>
      {isError && (
        <CardFooter>
          <Button className="w-full" render={<Link to="/login" />} nativeButton={false}>
            {translate("auth.buttons.goToLogIn")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
