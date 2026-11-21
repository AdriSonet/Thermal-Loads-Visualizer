// Moist air properties, ASHRAE Fundamentals 2017 (chapter 1). SI throughout:
// T in °C, w in kg of water per kg of dry air, h in J per kg of dry air, p in Pa, rh as 0–1.

export const P_SITE = 98400;          // Zaragoza, 247 m above sea level
export const CP_AIR = 1006, CP_VAP = 1860, H_FG0 = 2501000, CP_WATER = 4186;

// saturation pressure of water vapour, Hyland–Wexler; over ice below 0 °C
export function pws(T) {
  const K = T + 273.15;
  const ln = T < 0
    ? -5.6745359e3 / K + 6.3925247 - 9.677843e-3 * K + 6.2215701e-7 * K * K + 2.0747825e-9 * K ** 3 - 9.484024e-13 * K ** 4 + 4.1635019 * Math.log(K)
    : -5.8002206e3 / K + 1.3914993 - 4.8640239e-2 * K + 4.1764768e-5 * K * K - 1.4452093e-8 * K ** 3 + 6.5459673 * Math.log(K);
  return Math.exp(ln);
}
const wFromPw = (pw, p) => 0.621945 * pw / Math.max(1, p - pw);
const pwFromW = (w, p) => p * w / (0.621945 + w);

export const wSat = (T, p = P_SITE) => wFromPw(pws(T), p);
export const wFromRh = (T, rh, p = P_SITE) => wFromPw(rh * pws(T), p);
export const rhFromW = (T, w, p = P_SITE) => pwFromW(w, p) / pws(T);
export const h = (T, w) => CP_AIR * T + w * (H_FG0 + CP_VAP * T);
export const tFromHW = (hh, w) => (hh - w * H_FG0) / (CP_AIR + w * CP_VAP);
export const vol = (T, w, p = P_SITE) => 287.042 * (T + 273.15) * (1 + 1.607858 * w) / p;

function bisect(f, lo, hi) {            // f increasing in x
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
  return (lo + hi) / 2;
}
export function tdp(w, p = P_SITE) {
  if (!(w > 0)) return -60;
  const pw = pwFromW(w, p);
  return bisect(T => pws(T) - pw, -60, 90);
}
export function twb(T, w, p = P_SITE) {
  const ws = wSat(T, p);
  if (w >= ws) return T;
  // ASHRAE eq. 33 / 35: the humidity ratio a wet bulb at B would imply, increasing in B
  const f = B => {
    const s = wSat(B, p);
    const wi = B >= 0
      ? ((2501 - 2.326 * B) * s - 1.006 * (T - B)) / (2501 + 1.86 * T - 4.186 * B)
      : ((2830 - 0.24 * B) * s - 1.006 * (T - B)) / (2830 + 1.86 * T - 2.1 * B);
    return wi - w;
  };
  return bisect(f, -40, T);
}
export function state(T, w, p = P_SITE) {
  return { T, w, rh: rhFromW(T, w, p), h: h(T, w), tdp: tdp(w, p), twb: twb(T, w, p), v: vol(T, w, p) };
}
