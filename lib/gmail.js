// Gmail client multi-akun: 1 client_secret, N token (per email).
// Refresh singleflight PER AKUN (map email -> promise).
import googleapis, { gmail } from "@googleapis/gmail";
import fs from "node:fs";
import { hasToken, readToken, saveToken } from "./accounts.js";

const CREDENTIALS_PATH = process.env.GMAIL_CLIENT_SECRET || "";

let cachedCreds = null;
function loadCreds() {
  if (cachedCreds) return cachedCreds;
  if (!CREDENTIALS_PATH || !fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error("GMAIL_CLIENT_SECRET belum diset atau file gak ada");
  }
  const raw = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
  const creds = raw.installed || raw.web;
  if (!creds) throw new Error("Format client secret gak dikenali");
  cachedCreds = creds;
  return creds;
}

const EXPIRY_SLACK_MS = 60 * 1000;
const refreshMap = new Map(); // email -> Promise<tokens>

function tokenIsFresh(tokens) {
  if (!tokens?.access_token || !tokens?.expiry_date) return false;
  return Date.now() < tokens.expiry_date - EXPIRY_SLACK_MS;
}

function mergeAndSave(email, incoming) {
  try {
    const cur = readToken(email);
    saveToken(email, { ...cur, ...incoming });
  } catch {
    saveToken(email, incoming);
  }
}

async function doRefresh(email, oauth) {
  oauth.setCredentials(readToken(email));
  const { credentials } = await oauth.refreshAccessToken();
  mergeAndSave(email, credentials);
  return credentials;
}

export async function getGmail(email) {
  if (!email) throw new Error("EMAIL_WAJIB");
  if (!hasToken(email)) throw new Error(`NO_TOKEN:${email}`);

  const creds = loadCreds();
  const oauth = new googleapis.auth.OAuth2(creds.client_id, creds.client_secret);
  const tokens = readToken(email);

  if (!tokenIsFresh(tokens)) {
    if (tokens.refresh_token) {
      if (!refreshMap.has(email)) {
        refreshMap.set(email, doRefresh(email, oauth).finally(() => refreshMap.delete(email)));
      }
      oauth.setCredentials(await refreshMap.get(email));
    } else {
      oauth.setCredentials(tokens); // pakai apa adanya, 401 kalau expired
    }
  } else {
    oauth.setCredentials(tokens);
  }

  oauth.on("tokens", (t) => { if (t.access_token) mergeAndSave(email, t); });

  return gmail({ version: "v1", auth: oauth });
}

export function buildAliasQuery(alias) {
  return `to:${alias}`;
}

export function oauthClient(redirectUri) {
  const creds = loadCreds();
  const oauth = new googleapis.auth.OAuth2(creds.client_id, creds.client_secret, redirectUri);
  return oauth;
}
