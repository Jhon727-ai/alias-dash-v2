// Helper: ambil akun aktif dari cookie; fallback ke akun connected pertama.
import { getAccount, listAccounts } from "./accounts.js";

export function activeEmail(req) {
  const m = (req.headers.get("cookie") || "").match(/active_account=([^;]+)/);
  const cookieVal = m ? decodeURIComponent(m[1]) : "";
  if (cookieVal && getAccount(cookieVal)) return cookieVal;
  // fallback: akun connected pertama
  const first = listAccounts().find(a => a.connected);
  return first?.email || "";
}
