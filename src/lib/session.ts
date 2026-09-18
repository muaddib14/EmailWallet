import "server-only";
import { cookies } from "next/headers";
import { getSession } from "@/lib/db/queries";

const SESSION_COOKIE = "wm_session";

/** Reads the session cookie and returns the authenticated address, or null. */
export async function currentAddress(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await getSession(sessionId);
  return session?.address ?? null;
}
