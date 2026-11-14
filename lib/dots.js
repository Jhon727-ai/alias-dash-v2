// Dot-trick & plus-addressing generator untuk Gmail.
// Gmail mengabaikan titik di local part -> semua kombinasi mengarah ke 1 inbox.

export function dotCombinations(local) {
  const letters = local.replace(/\./g, "").split("");
  if (letters.length === 0) return [];
  if (letters.length > 15) {
    // batasi supaya gak meledak (2^15 = 32768 masih ok, lebih dari itu takar)
    return [];
  }
  const total = 1 << (letters.length - 1);
  const out = [];
  for (let mask = 0; mask < total; mask++) {
    let s = letters[0];
    for (let i = 1; i < letters.length; i++) {
      if (mask & (1 << (i - 1))) s += ".";
      s += letters[i];
    }
    out.push(s);
  }
  return out;
}

export function plusAlias(local, tag) {
  const clean = local.replace(/\./g, "");
  const safeTag = String(tag || "").trim().replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safeTag) return null;
  return `${clean}+${safeTag}`;
}

export function isValidEmailLocal(local) {
  return /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/.test(local);
}
