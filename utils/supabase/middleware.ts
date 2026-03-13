import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // IMPORTANT: Do not add any code between createServerClient and getUser().
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    // If refresh token is invalid/expired, clear stale auth cookies so the
    // user isn't permanently locked out with a bad session.
    if (userError && userError.status === 400) {
        const clearResponse = NextResponse.redirect(new URL('/login', request.url));
        // Wipe all sb-* (Supabase) auth cookies
        request.cookies.getAll()
            .filter(c => c.name.startsWith('sb-'))
            .forEach(c => clearResponse.cookies.delete(c.name));
        return clearResponse;
    }

    if (
        !user &&
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/auth')  // covers /auth/callback OAuth redirect
    ) {
        // For API routes: return 401 JSON so the client can handle it gracefully
        if (request.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // For page routes: redirect to login
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}
