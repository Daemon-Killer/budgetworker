import Link from "next/link";
import { getSession } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";
import { Brand } from "./Brand";
export async function Nav() {
  const user = await getSession();
  return (
    <header className="bw-nav">
      <div>
        <Brand />
        <nav aria-label="Main navigation">
          <Link href="/workers" className="bw-desktop-only">Find help</Link>
          <Link href="/packs">Resume plans</Link>
          <Link href="/workers" className="bw-desktop-only">
            All workers
          </Link>
          {user ? (
            <>
              <Link href="/account" className="bw-desktop-only">
                Account
              </Link>
              {user.role === "ADMIN" && <Link href="/admin">Admin</Link>}
              <span className="bw-desktop-only">
                <LogoutButton />
              </span>
            </>
          ) : (
            <Link href="/login" className="bw-nav-login">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
