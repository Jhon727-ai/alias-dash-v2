// Migrasi data v1 -> v2: alias maztel85 jadi akun pertama.
// Jalankan sekali: node scripts/migrate-v1.js
import fs from "node:fs";
import { addAccount, saveToken, mutateAliases } from "../lib/accounts.js";

const V1 = "/root/alias-dash";

async function main() {
  // 1. akun pertama
  const master = "maztel85@gmail.com";
  await addAccount(master, "utama");
  console.log("akun didaftarkan:", master);

  // 2. token v1 -> tokens/<email>.json
  const tokenSrc = `${V1}/gmail_token.json`;
  if (fs.existsSync(tokenSrc)) {
    saveToken(master, JSON.parse(fs.readFileSync(tokenSrc, "utf-8")));
    console.log("token v1 dicopy ->", `data/tokens/${master}.json`);
  } else {
    console.log("token v1 gak ada, skip");
  }

  // 3. aliases v1 -> aliases/<email>.json (plus last_used_at ikut)
  const aliasSrc = `${V1}/aliases.json`;
  if (fs.existsSync(aliasSrc)) {
    const list = JSON.parse(fs.readFileSync(aliasSrc, "utf-8"));
    await mutateAliases(master, () => list);
    console.log(`aliases v1 dimigrasi: ${list.length} alias`);
  } else {
    console.log("aliases.json v1 gak ada, skip");
  }

  console.log("MIGRASI SELESAI");
}

main().catch(e => { console.error(e); process.exit(1); });
