import "server-only";

import crypto from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const base32Encode = (buffer: Buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
};

const base32Decode = (input: string) => {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
};

export const generateTotpSecret = () => {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
};

export const buildOtpAuthUrl = (params: {
  secret: string;
  label: string;
  issuer: string;
}) => {
  const label = encodeURIComponent(params.label);
  const issuer = encodeURIComponent(params.issuer);
  return `otpauth://totp/${label}?secret=${params.secret}&issuer=${issuer}`;
};

const generateTotp = (secret: string, timestamp: number, digits = 6, step = 30) => {
  const counter = Math.floor(timestamp / 1000 / step);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));
  const key = base32Decode(secret);
  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  const otp = (code % 10 ** digits).toString().padStart(digits, "0");
  return otp;
};

export const verifyTotpToken = (
  secret: string,
  token: string,
  window = 1
) => {
  const clean = token.replace(/\s+/g, "");
  const now = Date.now();
  for (let offset = -window; offset <= window; offset += 1) {
    const ts = now + offset * 30 * 1000;
    if (generateTotp(secret, ts) === clean) {
      return true;
    }
  }
  return false;
};

export const generateRecoveryCodes = (count = 8) => {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(6).toString("hex").toUpperCase();
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  });
};

export const normalizeRecoveryCode = (code: string) =>
  code.toUpperCase().replace(/[^A-Z0-9]/g, "");

export const hashRecoveryCode = (code: string) => {
  const normalized = normalizeRecoveryCode(code);
  return crypto.createHash("sha256").update(normalized).digest("hex");
};
