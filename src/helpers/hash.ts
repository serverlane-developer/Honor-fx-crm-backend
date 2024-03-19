import crypto from "crypto";

const generateZapayHash = (body: Record<string, string | undefined>, secret: string) => {
  const stringToHash = Object.keys(body)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .filter((x) => body[x])
    .map((x) => `${x}=${body[x]}`)
    .join("|");
  const hash = crypto.createHmac("sha256", secret).update(stringToHash).digest("hex");
  return hash;
};

const generateIsmartPayHash = (mid: string, key: string, transaction_id: string, order_id: string) => {
  const stringToHash = `${mid}-${key}-${transaction_id}-${order_id}`;
  const hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
  return hash;
};

export default { generateZapayHash, generateIsmartPayHash };
