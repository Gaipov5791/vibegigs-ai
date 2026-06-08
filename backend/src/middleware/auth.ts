import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/supabase";

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = header.slice(7);
  const user = await verifyAccessToken(token);

  if (!user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.user = user;
  next();
}
