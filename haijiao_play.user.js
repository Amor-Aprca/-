// ==UserScript==
// @name         海角视频 M3U8 获取器6.3 - 完整版解密直播(手机兼容)
// @name:zh-CN   海角视频 M3U8 获取器6.3 - 完整版解密直播(手机兼容)
// @name:en      HAIJIO M3U8 Extractor 6.3 (Decrypt & Play, mobile)
// @namespace    http://tampermonkey.net/
// @version      6.3.0
// @description  手机兼容版: fetch优先(不依赖GM), WASM回退到页面自带, key变体枚举+AES自校验(0x47同步字节)自动找对真实key, 播放器在主世界运行
// @match        *://www.haijiao.com/*
// @match        *://ha085dbb23fc3.xyz/*
// @grant        GM_xmlhttpRequest
// @connect      *
// @license      MIT
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // ---------------- 内置 WASM (jquery_key) ----------------
  const WASM_B64 = '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T3V0IG9mIG1lbW9yeQBSZXNvdXJjZSBidXN5AEludGVycnVwdGVkIHN5c3RlbSBjYWxsAFJlc291cmNlIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlAEludmFsaWQgc2VlawBDcm9zcy1kZXZpY2UgbGluawBSZWFkLW9ubHkgZmlsZSBzeXN0ZW0ARGlyZWN0b3J5IG5vdCBlbXB0eQBDb25uZWN0aW9uIHJlc2V0IGJ5IHBlZXIAT3BlcmF0aW9uIHRpbWVkIG91dABDb25uZWN0aW9uIHJlZnVzZWQASG9zdCBpcyBkb3duAEhvc3QgaXMgdW5yZWFjaGFibGUAQWRkcmVzcyBpbiB1c2UAQnJva2VuIHBpcGUASS9PIGVycm9yAE5vIHN1Y2ggZGV2aWNlIG9yIGFkZHJlc3MAQmxvY2sgZGV2aWNlIHJlcXVpcmVkAE5vIHN1Y2ggZGV2aWNlAE5vdCBhIGRpcmVjdG9yeQBJcyBhIGRpcmVjdG9yeQBUZXh0IGZpbGUgYnVzeQBFeGVjIGZvcm1hdCBlcnJvcgBJbnZhbGlkIGFyZ3VtZW50AEFyZ3VtZW50IGxpc3QgdG9vIGxvbmcAU3ltYm9saWMgbGluayBsb29wAEZpbGVuYW1lIHRvbyBsb25nAFRvbyBtYW55IG9wZW4gZmlsZXMgaW4gc3lzdGVtAE5vIGZpbGUgZGVzY3JpcHRvcnMgYXZhaWxhYmxlAEJhZCBmaWxlIGRlc2NyaXB0b3IATm8gY2hpbGQgcHJvY2VzcwBCYWQgYWRkcmVzcwBGaWxlIHRvbyBsYXJnZQBUb28gbWFueSBsaW5rcwBObyBsb2NrcyBhdmFpbGFibGUAUmVzb3VyY2UgZGVhZGxvY2sgd291bGQgb2NjdXIAU3RhdGUgbm90IHJlY292ZXJhYmxlAE93bmVyIGRpZWQAT3BlcmF0aW9uIGNhbmNlbGVkAEZ1bmN0aW9uIG5vdCBpbXBsZW1lbnRlZABObyBtZXNzYWdlIG9mIGRlc2lyZWQgdHlwZQBJZGVudGlmaWVyIHJlbW92ZWQARGV2aWNlIG5vdCBhIHN0cmVhbQBObyBkYXRhIGF2YWlsYWJsZQBEZXZpY2UgdGltZW91dABPdXQgb2Ygc3RyZWFtcyByZXNvdXJjZXMATGluayBoYXMgYmVlbiBzZXZlcmVkAFByb3RvY29sIGVycm9yAEJhZCBtZXNzYWdlAEZpbGUgZGVzY3JpcHRvciBpbiBiYWQgc3RhdGUATm90IGEgc29ja2V0AERlc3RpbmF0aW9uIGFkZHJlc3MgcmVxdWlyZWQATWVzc2FnZSB0b28gbGFyZ2UAUHJvdG9jb2wgd3JvbmcgdHlwZSBmb3Igc29ja2V0AFByb3RvY29sIG5vdCBhdmFpbGFibGUAUHJvdG9jb2wgbm90IHN1cHBvcnRlZABTb2NrZXQgdHlwZSBub3Qgc3VwcG9ydGVkAE5vdCBzdXBwb3J0ZWQAUHJvdG9jb2wgZmFtaWx5IG5vdCBzdXBwb3J0ZWQAQWRkcmVzcyBmYW1pbHkgbm90IHN1cHBvcnRlZCBieSBwcm90b2NvbABBZGRyZXNzIG5vdCBhdmFpbGFibGUATmV0d29yayBpcyBkb3duAE5ldHdvcmsgdW5yZWFjaGFibGUAQ29ubmVjdGlvbiByZXNldCBieSBuZXR3b3JrAENvbm5lY3Rpb24gYWJvcnRlZABObyBidWZmZXIgc3BhY2UgYXZhaWxhYmxlAFNvY2tldCBpcyBjb25uZWN0ZWQAU29ja2V0IG5vdCBjb25uZWN0ZWQAQ2Fubm90IHNlbmQgYWZ0ZXIgc29ja2V0IHNodXRkb3duAE9wZXJhdGlvbiBhbHJlYWR5IGluIHByb2dyZXNzAE9wZXJhdGlvbiBpbiBwcm9ncmVzcwBTdGFsZSBmaWxlIGhhbmRsZQBEYXRhIGNvbnNpc3RlbmN5IGVycm9yAFJlc291cmNlIG5vdCBhdmFpbGFibGUAUmVtb3RlIEkvTyBlcnJvcgBRdW90YSBleGNlZWRlZABObyBtZWRpdW0gZm91bmQAV3JvbmcgbWVkaXVtIHR5cGUATXVsdGlob3AgYXR0ZW1wdGVkAFJlcXVpcmVkIGtleSBub3QgYXZhaWxhYmxlAEtleSBoYXMgZXhwaXJlZABLZXkgaGFzIGJlZW4gcmV2b2tlZABLZXkgd2FzIHJlamVjdGVkIGJ5IHNlcnZpY2UAAEHgkQQLnAGQCwEAAAAAAAUAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAADAAAAlAkBAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAD//////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOgIAQAAlAEPdGFyZ2V0X2ZlYXR1cmVzCCsLYnVsay1tZW1vcnkrD2J1bGstbWVtb3J5LW9wdCsWY2FsbC1pbmRpcmVjdC1vdmVybG9uZysKbXVsdGl2YWx1ZSsPbXV0YWJsZS1nbG9iYWxzKxNub250cmFwcGluZy1mcHRvaW50Kw9yZWZlcmVuY2UtdHlwZXMrCHNpZ24tZXh0';

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  function toHex(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i++) s += (u8[i] < 16 ? '0' : '') + u8[i].toString(16);
    return s;
  }

  // ---------------- 纯JS AES-128 (列主序, 用于校验key) ----------------
  const AES_SBOX = [
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
    0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
    0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
    0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
    0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
    0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
    0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
    0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
    0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
    0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
    0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
    0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
    0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
  ];
  const AES_RSBOX = new Array(256);
  for (let i = 0; i < 256; i++) AES_RSBOX[AES_SBOX[i]] = i;
  const RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

  function xtime(a) { return ((a << 1) ^ ((a & 0x80) ? 0x1b : 0)) & 0xff; }
  function gm(a, b) { let r = 0; while (b) { if (b & 1) r ^= a; a = xtime(a); b >>= 1; } return r; }
  function aesExpandKey(key) {
    const w = new Array(44).fill(0);
    for (let i = 0; i < 16; i++) w[i >>> 2] |= key[i] << ((3 - (i & 3)) * 8);
    for (let i = 4; i < 44; i++) {
      let t = w[i - 1];
      if (i % 4 === 0) {
        t = ((t << 8) | (t >>> 24)) >>> 0;
        t = ((AES_SBOX[(t >>> 24) & 0xff] << 24) | (AES_SBOX[(t >>> 16) & 0xff] << 16) | (AES_SBOX[(t >>> 8) & 0xff] << 8) | AES_SBOX[t & 0xff]) >>> 0;
        t = (t ^ (RCON[(i >>> 2) - 1] << 24)) >>> 0;
      }
      w[i] = (w[i - 4] ^ t) >>> 0;
    }
    return w;
  }
  function aesAddRoundKey(s, w, round) {
    for (let c = 0; c < 4; c++) {
      const wv = w[round * 4 + c];
      for (let r = 0; r < 4; r++) s[c * 4 + r] ^= (wv >>> (24 - 8 * r)) & 0xff;
    }
  }
  function aesShiftRows(s, inv) {
    const t = s.slice();
    for (let r = 1; r < 4; r++) for (let c = 0; c < 4; c++) s[c * 4 + r] = t[((inv ? (c - r + 4) : (c + r)) % 4) * 4 + r];
  }
  function aesMixColumns(s, inv) {
    for (let c = 0; c < 4; c++) {
      const a0 = s[c * 4], a1 = s[c * 4 + 1], a2 = s[c * 4 + 2], a3 = s[c * 4 + 3];
      let b0, b1, b2, b3;
      if (!inv) {
        b0 = xtime(a0) ^ xtime(a1) ^ a1 ^ a2 ^ a3;
        b1 = a0 ^ xtime(a1) ^ xtime(a2) ^ a2 ^ a3;
        b2 = a0 ^ a1 ^ xtime(a2) ^ xtime(a3) ^ a3;
        b3 = xtime(a0) ^ a0 ^ a1 ^ a2 ^ xtime(a3);
      } else {
        b0 = gm(a0, 14) ^ gm(a1, 11) ^ gm(a2, 13) ^ gm(a3, 9);
        b1 = gm(a0, 9) ^ gm(a1, 14) ^ gm(a2, 11) ^ gm(a3, 13);
        b2 = gm(a0, 13) ^ gm(a1, 9) ^ gm(a2, 14) ^ gm(a3, 11);
        b3 = gm(a0, 11) ^ gm(a1, 13) ^ gm(a2, 9) ^ gm(a3, 14);
      }
      s[c * 4] = b0; s[c * 4 + 1] = b1; s[c * 4 + 2] = b2; s[c * 4 + 3] = b3;
    }
  }
  function aesEncryptBlock(inp, w) {
    const s = new Array(16);
    for (let i = 0; i < 16; i++) s[i] = inp[i];
    aesAddRoundKey(s, w, 0);
    for (let round = 1; round <= 9; round++) {
      for (let i = 0; i < 16; i++) s[i] = AES_SBOX[s[i]];
      aesShiftRows(s, false);
      aesMixColumns(s, false);
      aesAddRoundKey(s, w, round);
    }
    for (let i = 0; i < 16; i++) s[i] = AES_SBOX[s[i]];
    aesShiftRows(s, false);
    aesAddRoundKey(s, w, 10);
    return s;
  }
  function aesDecryptBlock(inp, w) {
    const s = new Array(16);
    for (let i = 0; i < 16; i++) s[i] = inp[i];
    aesAddRoundKey(s, w, 10);
    for (let round = 9; round >= 1; round--) {
      aesShiftRows(s, true);
      for (let i = 0; i < 16; i++) s[i] = AES_RSBOX[s[i]];
      aesAddRoundKey(s, w, round);
      aesMixColumns(s, true);
    }
    aesShiftRows(s, true);
    for (let i = 0; i < 16; i++) s[i] = AES_RSBOX[s[i]];
    aesAddRoundKey(s, w, 0);
    return s;
  }
  // CBC 解密前 numBlocks 个块, 用于校验
  function aesCbcDecryptFirst(cipher, key16, iv16, numBlocks) {
    const w = aesExpandKey(key16);
    const out = [];
    let prev = iv16.slice();
    for (let b = 0; b < numBlocks; b++) {
      const blk = cipher.slice(b * 16, b * 16 + 16);
      const dec = aesDecryptBlock(blk, w);
      for (let i = 0; i < 16; i++) out.push(dec[i] ^ prev[i]);
      prev = blk;
    }
    return out;
  }
  // 校验: 解密后前384字节的MPEG-TS同步字节 0x47 是否在 0/188/376
  function validateKey(key16, iv16, seg0) {
    if (!seg0 || seg0.length < 384) return false;
    const p = aesCbcDecryptFirst(seg0, key16, iv16, 24);
    return p[0] === 0x47 && p[188] === 0x47 && p[376] === 0x47;
  }

  // ---------------- WASM jquery_key (内置优先, 失败回退页面自带createModule) ----------------
  async function runJqueryKey(keyBytes, saltBytes) {
    try {
      const imports = {
        env: { _abort_js: () => { throw new Error('abort'); }, emscripten_resize_heap: () => true },
        wasi_snapshot_preview1: { fd_close: () => 0, fd_write: () => 0, fd_seek: () => 0 }
      };
      const { instance } = await WebAssembly.instantiate(b64ToBytes(WASM_B64), imports);
      const ex = instance.exports;
      const mem = new Uint8Array(ex.memory.buffer);
      mem.set(keyBytes, 0);
      mem.set(saltBytes, 4096);
      ex.jquery_key(0, keyBytes.length, 4096, saltBytes.length);
      return mem.slice(0, keyBytes.length);
    } catch (e) {
      const pageWin = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
      const cm = pageWin.createModule;
      if (!cm) throw new Error('WASM不可用(内置与页面都失败)');
      const mod = await cm();
      const ip = mod._malloc(keyBytes.length), np = mod._malloc(saltBytes.length);
      mod.HEAPU8.set(keyBytes, ip);
      mod.HEAPU8.set(saltBytes, np);
      mod.ccall('jquery_key', null, ['number', 'number', 'number', 'number'], [ip, keyBytes.length, np, saltBytes.length]);
      const out = new Uint8Array(mod.HEAPU8.buffer, ip, keyBytes.length).slice();
      mod._free(ip); mod._free(np);
      return out;
    }
  }

  // ---------------- 网络: fetch优先(手机无GM也能用), 失败回退GM ----------------
  async function httpBuf(url) {
    try {
      const r = await fetch(url);
      if (r.ok) return new Uint8Array(await r.arrayBuffer());
    } catch (e) { /* fallthrough */ }
    if (typeof GM_xmlhttpRequest === 'function') {
      return await new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET', url, responseType: 'arraybuffer', timeout: 20000,
          headers: { 'Referer': location.href, 'Cookie': document.cookie },
          onload: r => (r.status === 200 || r.status === 206) ? resolve(new Uint8Array(r.response)) : reject(new Error('HTTP ' + r.status + ' ' + url)),
          onerror: () => reject(new Error('网络错误 ' + url)),
          ontimeout: () => reject(new Error('超时 ' + url))
        });
      });
    }
    throw new Error('请求失败: ' + url);
  }
  async function httpText(url) {
    const b = await httpBuf(url);
    return new TextDecoder().decode(b);
  }

  // ---------------- 完整版 m3u8 推导 ----------------
  // TS: .../13872644bzPyQ2ac_i0.ts  ->  完整版: .../13872644bzPyQ2ac_i.m3u8
  function deriveFullM3u8(tsUrl) {
    const i = tsUrl.lastIndexOf('/');
    const path = tsUrl.slice(0, i);
    const name = tsUrl.slice(i + 1);
    const us = name.lastIndexOf('_');
    if (us === -1) return null;
    return path + '/' + name.slice(0, us + 1) + 'i.m3u8';
  }
  // 移动端原生HLS会给hostname加kversion前缀(如 0ts10.hj...) 去掉它
  function normalizeHost(u) {
    try {
      const url = new URL(u);
      url.hostname = url.hostname.replace(/^\d+(?=ts\d+\.hj)/i, '');
      return url.href;
    } catch (e) { return u; }
  }
  function ivHexToBytes(ivHex) {
    const h = ivHex.replace(/^0x/i, '').padStart(32, '0');
    const b = new Uint8Array(16);
    for (let i = 0; i < 16; i++) b[i] = parseInt(h.substr(i * 2, 2), 16);
    return b;
  }

  // ---------------- 主世界播放器桥 (沙箱blob页面取不到) ----------------
  function __hjMainPlayer() {
    window.__hjStartPlayer = function (payloadJson) {
      try {
        const info = JSON.parse(payloadJson);
        const old = document.getElementById('hj6Player');
        if (old) { if (old.__hls) old.__hls.destroy(); old.remove(); }
        const m3u8BlobUrl = URL.createObjectURL(new Blob([info.m3u8Text], { type: 'application/vnd.apple.mpegurl' }));
        const wrap = document.createElement('div');
        wrap.id = 'hj6Player';
        wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#000;display:flex;flex-direction:column;';
        wrap.innerHTML =
          '<div style="flex:0 0 auto;background:#101214;color:#eee;font:13px/1.6 system-ui;padding:8px 12px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">' +
          '<b style="color:#ffd34d;">🔓 完整版直播 (key已替换)</b>' +
          '<span id="hj6-file" style="color:#9ab;word-break:break-all;max-width:30vw;"></span>' +
          '<span style="color:#22ff88;">Key: <b id="hj6-key"></b></span>' +
          '<button id="hj6-copy" style="cursor:pointer;background:#1c3;color:#000;border:0;border-radius:4px;padding:2px 8px;">复制Key</button>' +
          '<button id="hj6-save" style="cursor:pointer;background:#258;color:#fff;border:0;border-radius:4px;padding:2px 8px;">保存替换后m3u8</button>' +
          '<button id="hj6-close" style="cursor:pointer;background:#c33;color:#fff;border:0;border-radius:4px;padding:2px 8px;">关闭</button>' +
          '</div>' +
          '<div style="flex:1;display:flex;align-items:center;justify-content:center;">' +
          '<video id="hj6-video" controls autoplay muted playsinline style="max-width:100%;max-height:100%;"></video>' +
          '</div>' +
          '<div id="hj6-status" style="flex:0 0 auto;background:#000;color:#ff6;font:12px/1.5 monospace;padding:4px 12px;min-height:18px;"></div>';
        document.body.appendChild(wrap);
        const setStatus = (t) => { wrap.querySelector('#hj6-status').textContent = t; };
        wrap.querySelector('#hj6-file').textContent = info.url;
        wrap.querySelector('#hj6-key').textContent = info.keyHex;
        wrap.querySelector('#hj6-copy').addEventListener('click', () => {
          navigator.clipboard.writeText(info.keyHex).then(() => setStatus('✔ Key 已复制: ' + info.keyHex));
        });
        wrap.querySelector('#hj6-close').addEventListener('click', () => { if (wrap.__hls) wrap.__hls.destroy(); wrap.remove(); });
        wrap.querySelector('#hj6-save').addEventListener('click', () => {
          const a = document.createElement('a');
          a.href = m3u8BlobUrl;
          a.download = 'playlist_decrypted_' + Date.now() + '.m3u8';
          a.click();
          setStatus('✔ 已保存替换key后的m3u8');
        });
        setStatus('正在解密播放...');
        const video = wrap.querySelector('#hj6-video');
        const start = () => {
          const HlsCtor = window.Hls;
          if (!HlsCtor || !HlsCtor.isSupported()) {
            if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = m3u8BlobUrl; video.play().catch(() => {}); return; }
            setStatus('❌ 当前浏览器不支持 HLS');
            return;
          }
          const hls = new HlsCtor({ maxBufferLength: 30, fragLoadingRetryDelay: 500, manifestLoadingMaxRetry: 3, levelLoadingMaxRetry: 3 });
          hls.loadSource(m3u8BlobUrl);
          hls.attachMedia(video);
          hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
            setStatus('✔ key已替换为真key, 完整版播放中(若无声请点画面取消静音)');
            video.play().catch(() => setStatus('点击画面播放(浏览器自动播放策略)'));
          });
          hls.on(HlsCtor.Events.ERROR, (e, d) => { if (d && d.fatal) setStatus('❌ 播放错误: ' + d.type + ' / ' + d.details); });
          wrap.__hls = hls;
        };
        if (window.Hls) start();
        else {
          const s = document.createElement('script');
          s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1';
          s.onload = start;
          s.onerror = () => setStatus('❌ hls.js 加载失败');
          document.head.appendChild(s);
        }
      } catch (e) {
        console.error('[HJ6] 主世界播放器错误:', e);
        alert('❌ 播放器错误: ' + e.message);
      }
    };
  }
  function ensureMainWorldBridge() {
    return new Promise((resolve) => {
      const pageWin = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
      if (pageWin.__hjStartPlayer) return resolve();
      try {
        const s = document.createElement('script');
        s.textContent = '(' + __hjMainPlayer.toString() + ')();';
        (document.head || document.documentElement).appendChild(s);
        setTimeout(() => { s.remove(); resolve(); }, 300);
      } catch (e) { console.error('[HJ6] 注入主世界桥失败:', e); resolve(); }
    });
  }

  // ---------------- 核心: 抓key变体->推导->AES校验->重写m3u8->主世界播放 ----------------
  async function decryptAndPlay(m3u8Url) {
    m3u8Url = normalizeHost(m3u8Url);
    let text = await httpText(m3u8Url);

    if (/#EXT-X-STREAM-INF/i.test(text)) {
      const m = text.match(/^([^\r\n#][^\r\n]*\.m3u8[^\r\n]*)$/im);
      if (!m) throw new Error('主播放列表中没有分片列表');
      const base = m3u8Url.slice(0, m3u8Url.lastIndexOf('/') + 1);
      m3u8Url = normalizeHost(new URL(m[1].trim(), base).href);
      text = await httpText(m3u8Url);
    }

    const km = text.match(/#EXT-X-KEY:METHOD=AES-128,URI="([^"]+)",IV=(0x[0-9a-fA-F]+)/);
    if (!km) throw new Error('未找到 AES-128 KEY 标签');
    const keyUri = km[1], ivHex = km[2];
    const base = m3u8Url.slice(0, m3u8Url.lastIndexOf('/') + 1);
    const segMatch = text.match(/^([^#\r\n][^\r\n]*\.ts)[\r\n]?/m);
    if (!segMatch) throw new Error('m3u8中未找到分片');

    const ivBytes = ivHexToBytes(ivHex);
    const saltText = await httpText(m3u8Url.replace(/\.m3u8$/i, '.jpg'));
    let salt;
    try { salt = b64ToBytes(saltText.trim()); } catch (e) { throw new Error('盐(.jpg)解析失败'); }
    const seg0 = (await httpBuf(base + segMatch[1].trim())).slice(0, 384);

    // key 候选列表(不同CDN节点/kversion下 key 内容可能不同)
    const kver = (JSON.parse(sessionStorage.getItem('config') || '{}').kversion) || '';
    const baseKeyUrl = base + keyUri;
    const candidates = [];
    const add = (u) => { if (u && !candidates.includes(u)) candidates.push(u); };
    add(baseKeyUrl);
    if (kver) add(baseKeyUrl.replace('.key', '.keyv' + kver));
    for (let i = 0; i <= 9; i++) {
      add(baseKeyUrl.replace('.key', '.keyv' + i));
      add(baseKeyUrl.replace('.key', '.key' + i));
    }

    let realKey = null, usedUrl = '';
    for (const u of candidates) {
      let kb;
      try { kb = (await httpBuf(u)).slice(0, 16); } catch (e) { continue; }
      if (kb.length !== 16) continue;
      let derived;
      try { derived = await runJqueryKey(kb, salt); } catch (e) { continue; }
      if (validateKey(derived, ivBytes, seg0)) { realKey = derived; usedUrl = u; break; }
    }
    if (!realKey) throw new Error('无法推导出有效key(已尝试' + candidates.length + '个key变体)');
    const keyHex = toHex(realKey);

    // 重写m3u8: key -> data:URI真key; 分片 -> CDN绝对地址
    let bin = '';
    for (const b of realKey) bin += String.fromCharCode(b);
    const keyDataUri = 'data:application/octet-stream;base64,' + btoa(bin);
    const outLines = text.split(/\r?\n/).map(l => {
      if (l.startsWith('#EXT-X-KEY:')) return l.replace(/URI="[^"]*"/, 'URI="' + keyDataUri + '"');
      const t = l.trim();
      if (t && !t.startsWith('#') && /\.ts($|\?)/i.test(t)) return /^https?:/i.test(t) ? t : base + t;
      return l;
    });
    const m3u8Text = outLines.join('\n');

    console.log('[HJ6] 完整版m3u8:', m3u8Url);
    console.log('[HJ6] 命中key文件:', usedUrl);
    console.log('[HJ6] 真实key :', keyHex);
    console.log('[HJ6] IV      :', ivHex);
    console.log('[HJ6] ✅ AES自校验通过(0x47同步), key已替换为 data:URI');

    await ensureMainWorldBridge();
    const pageWin = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    if (pageWin.__hjStartPlayer) {
      pageWin.__hjStartPlayer(JSON.stringify({ m3u8Text, url: m3u8Url, keyHex, ivHex, rawHex: '' }));
    } else {
      throw new Error('主世界播放器桥注入失败');
    }
  }

  // ---------------- 网络监听: 捕获TS/预览M3U8 ----------------
  let tsUrls = [];
  function addTs(u) { if (/\.ts($|\?)/i.test(u) && !tsUrls.includes(u)) tsUrls.push(u); }
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    const u = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');
    if (u) { if (/\.ts($|\?)/i.test(u)) addTs(u); if (/\.m3u8($|\?)/i.test(u)) console.log('[HJ6] 捕获m3u8:', u); }
    return origFetch.apply(this, args);
  };
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, u, ...rest) {
    if (typeof u === 'string') {
      if (/\.ts($|\?)/i.test(u)) addTs(u);
      if (/\.m3u8($|\?)/i.test(u)) console.log('[HJ6] 捕获m3u8:', u);
    }
    return origOpen.call(this, m, u, ...rest);
  };

  // ---------------- 悬浮按钮 ----------------
  function addButton() {
    if (document.getElementById('hj6Btn')) return;
    const btn = document.createElement('button');
    btn.id = 'hj6Btn';
    btn.textContent = '🔓 完整版直播';
    btn.style.cssText = 'position:fixed;top:90px;right:10px;z-index:999999;padding:12px 16px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:bold;box-shadow:0 2px 10px rgba(0,0,0,.3);';
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = '解析中...';
      try {
        if (tsUrls.length === 0 && performance.getEntriesByType) {
          performance.getEntriesByType('resource').forEach(r => { if (/\.ts($|\?)/i.test(r.name)) addTs(r.name); });
        }
        if (tsUrls.length === 0) {
          document.querySelectorAll('video').forEach(v => { if (v.__hls && v.__hls.url) tsUrls.push(v.__hls.url); });
        }
        let target = null;
        for (const t of tsUrls) { const full = deriveFullM3u8(t); if (full) { target = full; break; } }
        if (!target) { alert('未捕获到TS分片, 请先播放视频再点此按钮'); return; }
        await decryptAndPlay(target);
      } catch (e) {
        alert('❌ ' + e.message);
        console.error('[HJ6]', e);
      } finally {
        btn.disabled = false; btn.textContent = '🔓 完整版直播';
      }
    };
    document.body.appendChild(btn);
  }

  const mo = new MutationObserver(() => addButton());
  mo.observe(document, { subtree: true, childList: true });
  if (document.body) addButton();
  else window.addEventListener('DOMContentLoaded', addButton);
})();
