import crypto from "crypto";
import { PayinRequest } from "../@types/Payin/Paydunia";

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

const generatePayduniaHash = (mid: string, key: string, body: Omit<PayinRequest, "HASH">) => {
  let stringToHash = Object.keys(body)
    .sort()
    // eslint-disable
    .map((x: string) => body[x as keyof Omit<PayinRequest, "HASH">])
    .join("|");
  const defaultSalt = "qbeg";
  const salt = defaultSalt || crypto.randomBytes(3).toString("hex");
  stringToHash += "|" + salt;

  const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");

  const saltedHash = sha256 + salt;

  const hash = crypto.createHmac("sha256", key).update(saltedHash).digest("base64");
  // console.log({ body, stringToHash, key, salt, sha256, saltedHash, hash });
  return hash;
};

export default { generateZapayHash, generateIsmartPayHash, generatePayduniaHash };
