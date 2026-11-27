"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";
import { ROLE, type Role } from "@/constants/roles";
import { supabaseBrowser } from "@/lib/supabase/browser";

type MenuUser = { email: string; role: Role };

// Client-side so storefront pages stay static. Display only — every protected route re-checks on the server.
export function UserMenu({ signOutAction }: { signOutAction: () => Promise<void> }) {
  const [user, setUser] = useState<MenuUser | null | undefined>(undefined);

  useEffect(() => {
    const supabase = supabaseBrowser();

    async function load(userId: string | undefined, email: string | undefined) {
      if (!userId || !email) return setUser(null);
      const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      setUser({ email, role: data?.role ?? ROLE.CUSTOMER });
    }

    supabase.auth.getSession().then(({ data }) => load(data.session?.user.id, data.session?.user.email));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user.id, session?.user.email);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (user === undefined) return <div className="h-9 w-24" aria-hidden />;

  if (!user) {
    return (
      <div className="flex items-center gap-1">
        <Link href={ROUTES.login} className={buttonClasses({ variant: "ghost", size: "sm" })}>
          Sign in
        </Link>
        <Link href={ROUTES.signup} className={buttonClasses({ variant: "primary", size: "sm" })}>
          Create account
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {user.role !== ROLE.ADMIN && (
        <Link href={ROUTES.cart} className={buttonClasses({ variant: "ghost", size: "sm" })}>
          Basket
        </Link>
      )}
      <Link
        href={user.role === ROLE.ADMIN ? ROUTES.admin.root : ROUTES.account.root}
        className={buttonClasses({ variant: "secondary", size: "sm" })}
      >
        {user.role === ROLE.ADMIN ? "Console" : "My account"}
      </Link>
      <form action={signOutAction}>
        <button type="submit" className={buttonClasses({ variant: "ghost", size: "sm" })}>
          Sign out
        </button>
      </form>
    </div>
  );
}
