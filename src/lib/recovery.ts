export type RecoveryProof =
  | { kind: "tokens"; access_token: string; refresh_token: string }
  | { kind: "code"; code: string }
  | { kind: "hash"; token_hash: string };

export function parseRecoveryUrl(raw: string): RecoveryProof {
  const url = new URL(raw);
  if (!url.pathname.replace(/\/$/, "").endsWith("/reset-password") && url.hostname !== "reset-password") {
    throw new Error("Open a password reset link to continue.");
  }
  const query = url.searchParams;
  const fragment = new URLSearchParams(url.hash.slice(1));
  const get = (key: string) => {
    const values = [...query.getAll(key), ...fragment.getAll(key)];
    if (values.length > 1 || values.some(value => !value)) throw new Error("Invalid reset link.");
    return values[0];
  };
  if (get("error") || get("error_code")) throw new Error("This reset link has expired. Request a new one.");
  const access_token = get("access_token"), refresh_token = get("refresh_token");
  const code = get("code"), token_hash = get("token_hash"), type = get("type");
  if (Number(Boolean(access_token || refresh_token)) + Number(Boolean(code)) + Number(Boolean(token_hash)) !== 1) {
    throw new Error("This reset link is missing or has conflicting verification data.");
  }
  if (access_token && refresh_token && type === "recovery") return { kind: "tokens", access_token, refresh_token };
  if (token_hash && type === "recovery") return { kind: "hash", token_hash };
  if (code && (!type || type === "recovery")) return { kind: "code", code };
  throw new Error("This is not a valid password recovery link.");
}
