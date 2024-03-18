import crypto from "crypto";
import config from "../config";

const { ENCRYPTION_KEY, ENCRYPTION_IV } = config;

const key = crypto.createHash("sha512").update(ENCRYPTION_KEY, "utf-8").digest("hex").substr(0, 32);
const iv = crypto.createHash("sha512").update(ENCRYPTION_IV, "utf-8").digest("hex").substr(0, 16);
const algo = "AES-256-CBC";

const encrypt = (text: string) => {
  try {
    const encryptor = crypto.createCipheriv(algo, key, iv);
    const encryptedtext = encryptor.update(text, "utf8", "base64") + encryptor.final("base64");
    return Buffer.from(encryptedtext).toString("base64");
  } catch (err) {
    return text;
  }
};

const decrypt = (encryptedtext: string) => {
  try {
    const buff = Buffer.from(encryptedtext, "base64");
    encryptedtext = buff.toString("utf-8");
    const decryptor = crypto.createDecipheriv(algo, key, iv);
    return decryptor.update(encryptedtext, "base64", "utf8") + decryptor.final("utf8");
  } catch (err) {
    return encryptedtext;
  }
};

export { encrypt, decrypt };
