import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_KEY;

  const response = NextResponse.next();

  // Update Supabase session if config is present
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
          for (const cookie of cookiesToSet) {
            // Sync cookies between the request and the response created by i18n
            request.cookies.set(cookie.name, cookie.value);
            response.cookies.set(cookie.name, cookie.value, cookie.options as Record<string, unknown>);
          }
        },
      },
    });

    // Refreshes the session if it's expired
    await supabase.auth.getUser();
  }

  return response;
}

export const config = {
  // Using the more inclusive matcher from your root middleware
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
