"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { ROLE, type Role } from "@/constants/roles";

type Me = { signedIn: false } | { signedIn: true; email: string; fullName: string | null; role: Role; basketItems: number };

/**
 * Client-side so storefront pages stay static. It asks the server who is signed in (GET /api/v1/me) rather
 * than reading the session in the browser, so only the server ever refreshes tokens (D-073).
 * Display only — every protected route re-checks on the server.
 */
export function UserMenu({ signOutAction }: { signOutAction: () => Promise<void> }) {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/me", { cache: "no-store", signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { signedIn: false }))
      .then(setMe)
      .catch(() => undefined);
    return () => controller.abort();
  }, [pathname]);

  if (me === null) return <div className="h-9 w-24" aria-hidden />;

  if (!me.signedIn) {
    return (
      <div className="flex items-center gap-1">
        <Link href={ROUTES.login} className={buttonClasses({ variant: "ghost", size: "sm" })}>
          Sign in
        </Link>
        <Link href={ROUTES.signup} className={buttonClasses({ variant: "primary", size: "sm" }, "hidden sm:inline-flex")}>
          Create account
        </Link>
      </div>
    );
  }

  const isAdmin = me.role === ROLE.ADMIN;
  return (
    <div className="flex items-center gap-1">
      {!isAdmin && (
        <Link href={ROUTES.cart} className={buttonClasses({ variant: "ghost", size: "sm" }, "gap-1.5")}>
          Basket
          {me.basketItems > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-xs leading-5 text-accent-ink" aria-label={`${me.basketItems} items`}>
              {me.basketItems}
            </span>
          )}
        </Link>
      )}
      <Link href={isAdmin ? ROUTES.admin.root : ROUTES.account.root} className={buttonClasses({ variant: "secondary", size: "sm" })}>
        {isAdmin ? "Console" : "My account"}
      </Link>
      <form action={signOutAction}>
        <button type="submit" className={buttonClasses({ variant: "ghost", size: "sm" })}>
          Sign out
        </button>
      </form>
    </div>
  );
}
