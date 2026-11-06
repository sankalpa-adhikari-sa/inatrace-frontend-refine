import { Navigate, useLocation, useSearchParams } from "react-router";
import { safeRedirect } from "@/lib/safe-redirect";

export function LoggedInRedirect() {
  const [params] = useSearchParams();
  return <Navigate to={safeRedirect(params.get("to"))} replace />;
}

export function DropLastSegment() {
  const { pathname, search } = useLocation();
  return <Navigate to={pathname.replace(/\/[^/]+\/?$/, "") + search} replace />;
}
