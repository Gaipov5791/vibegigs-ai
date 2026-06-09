import { NextResponse } from "next/server";
import { createActionClient } from "@/lib/supabase/server";

export type AuthUser = { id: string; email: string };

export async function getAuthenticatedUser(
  request?: Request
): Promise<AuthUser | null> {
  const supabase = await createActionClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user?.email) {
    return { id: user.id, email: user.email };
  }

  const header = request?.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    const { data: tokenData, error: tokenError } =
      await supabase.auth.getUser(token);

    if (!tokenError && tokenData.user?.email) {
      return { id: tokenData.user.id, email: tokenData.user.email };
    }
  }

  return null;
}

export async function requireAuth(
  request?: Request
): Promise<{ user: AuthUser } | { error: NextResponse }> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user };
}
