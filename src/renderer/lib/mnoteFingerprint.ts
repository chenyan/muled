/** 规范化后取 SHA-1 前 8 位十六进制，用于 loc 的 fp=sha1:… */
export function normalizeFingerprintText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

export function sha1PrefixHex(text: string): string {
  const normalized = normalizeFingerprintText(text);
  if (!normalized) return '';
  return sha1Hex(normalized).slice(0, 8);
}

export function appendFingerprintToLoc(loc: string, text: string | undefined): string {
  if (!text?.trim()) return loc;
  const fp = sha1PrefixHex(text);
  if (!fp) return loc;
  return `${loc}; fp=sha1:${fp}`;
}

/** 纯 JS SHA-1（renderer 同步计算） */
function sha1Hex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    words[i >> 2] = words[i >> 2] ?? 0;
    words[i >> 2]! |= bytes[i]! << (24 - (i % 4) * 8);
  }
  words[bytes.length >> 2] = words[bytes.length >> 2] ?? 0;
  words[bytes.length >> 2]! |= 0x80 << (24 - (bytes.length % 4) * 8);
  words[(((bytes.length + 8) >> 6) + 1) * 16 - 1] = bytes.length * 8;

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;
  let e = 0xc3d2e1f0;

  for (let i = 0; i < words.length; i += 16) {
    const w = new Array<number>(80);
    for (let t = 0; t < 16; t += 1) {
      w[t] = words[i + t] ?? 0;
    }
    for (let t = 16; t < 80; t += 1) {
      w[t] = rotl(w[t - 3]! ^ w[t - 8]! ^ w[t - 14]! ^ w[t - 16]!, 1);
    }

    let aa = a;
    let bb = b;
    let cc = c;
    let dd = d;
    let ee = e;

    for (let t = 0; t < 80; t += 1) {
      let f: number;
      let k: number;
      if (t < 20) {
        f = (bb & cc) | (~bb & dd);
        k = 0x5a827999;
      } else if (t < 40) {
        f = bb ^ cc ^ dd;
        k = 0x6ed9eba1;
      } else if (t < 60) {
        f = (bb & cc) | (bb & dd) | (cc & dd);
        k = 0x8f1bbcdc;
      } else {
        f = bb ^ cc ^ dd;
        k = 0xca62c1d6;
      }
      const temp = (rotl(aa, 5) + f + ee + k + w[t]!) >>> 0;
      ee = dd;
      dd = cc;
      cc = rotl(bb, 30) >>> 0;
      bb = aa;
      aa = temp;
    }

    a = (a + aa) >>> 0;
    b = (b + bb) >>> 0;
    c = (c + cc) >>> 0;
    d = (d + dd) >>> 0;
    e = (e + ee) >>> 0;
  }

  return [a, b, c, d, e].map((n) => n.toString(16).padStart(8, '0')).join('');
}

function rotl(n: number, s: number): number {
  return (n << s) | (n >>> (32 - s));
}
