import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/config/env.public";
import { PROTECTED_PREFIXES, ROUTES } from "@/constants/routes";

// Refreshes the Supabase session cookie on every request and bounces signed-out users from protected areas.
// Role checks (admin) happen server-side in layouts and controllers — the proxy is not the security boundary.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = publicEnv();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims() validates the JWT; do not run code between client creation and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  const isProtected = [...PROTECTED_PREFIXES.customer, ...PROTECTED_PREFIXES.admin].some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (isProtected && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = ROUTES.login;
    url.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|api/v1/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
