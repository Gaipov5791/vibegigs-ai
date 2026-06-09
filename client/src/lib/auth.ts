import { NextResponse } from "next/server";
import { verifyAccessToken } from "./supabase-admin";

export type AuthUser = { id: string; email: string };

export async function getAuthenticatedUser(
  request: Request
): Promise<AuthUser | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  const token = header.slice(7);
  return verifyAccessToken(token);
}

export async function requireAuth(
  request: Request
): Promise<{ user: AuthUser } | { error: NextResponse }> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user };
}
