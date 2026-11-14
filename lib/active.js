// Helper: ambil akun aktif. Prioritas:
//   1. Header X-Account (buat API key client yang mau switch akun)
//   2. Cookie active_account (browser session)
//   3. Fallback: akun connected pertama
import { getAccount, listAccounts } from "./accounts.js";

export function activeEmail(req) {
  // 1) X-Account header (hanya resmi dipake client API key; browser juga boleh, validasi tetap ketat)
  const xacc = (req.headers.get("x-account") || "").trim().toLowerCase();
  if (xacc && getAccount(xacc)) return xacc;

  // 2) cookie
  const m = (req.headers.get("cookie") || "").match(/active_account=([^;]+)/);
  const cookieVal = m ? decodeURIComponent(m[1]) : "";
  if (cookieVal && getAccount(cookieVal)) return cookieVal;

  // 3) fallback: akun connected pertama
  const first = listAccounts().find(a => a.connected);
  return first?.email || "";
}
