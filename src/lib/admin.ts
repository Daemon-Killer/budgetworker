import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "./auth";
import { ROLES } from "./constants";

/** Server pages: require admin or bounce to login / home. */
export async function requireAdminPage(nextPath = "/admin"): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  if (session.role !== ROLES.ADMIN) {
    redirect("/?error=admin_only");
  }
  return session;
}
