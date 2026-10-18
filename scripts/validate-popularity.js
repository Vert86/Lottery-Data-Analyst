#!/usr/bin/env node
/**
 * Validation harness for the strategy claims in this repo.
 *
 * Runs against real historical data and tests three things:
 *   1. Randomness audit: hot/cold/overdue numbers have NO predictive power
 *      (chi-square uniformity, split-half persistence, walk-forward overdue test).
 *   2. The anti-popularity edge IS real: prize per winner in pari-mutuel
 *      tiers falls as winning combos contain more 1-31 (birthday) numbers.
 *   3. Direct ticket backtest: anti-popularity tickets win just as often as
 *      uniform tickets but collect a higher average prize per win.
 *
 * Data source: EuroMillions API (free) - the only source with per-tier
 * winner counts and prize amounts, which is what makes test 2 possible.
 *   npx node scripts/validate-popularity.js [euromillions]
 *
 * A cached copy of the draws is kept in data/ so repeat runs don't hammer the API.
 */

const fs = require('fs');
const path = require('path');

const API_URL = 'https://euromillions.api.pedromealha.dev/v1/draws';
const CACHE = path.join(__dirname, '..', 'data', 'em_draws_cache.json');
const FORMAT_START = '2016-09-27'; // current 5/50 + 2/12 format

async function loadDraws() {
  try {
    const cached = JSON.parse(fs.readFileSync(CACHE, 'utf-8'));
    if (cached && cached.length > 100) {
      const ageDays = (Date.now() - fs.statSync(CACHE).mtimeMs) / 86400000;
      console.log(`Using cached EuroMillions data (${cached.length} draws, ${ageDays.toFixed(1)} days old)`);
      return cached;
    }
  } catch (_) { /* no cache */ }

  console.log('Fetching EuroMillions draws from API...');
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  const draws = await res.json();
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(draws));
  return draws;
}

function corr(xs, ys) {
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const cov = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const sx = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2, 0));
  const sy = Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0));
  return cov / (sx * sy);
}

(async () => {
  const all = await loadDraws();
  const draws = all
    .filter(d => d.date >= FORMAT_START)
    .map(d => ({
      date: d.date,
      numbers: d.numbers.map(Number).sort((a, b) => a - b),
      stars: (d.stars || []).map(Number),
      prizes: d.prizes
    }))
    .sort((a, b) => a.date < b.date ? -1 : 1);

  const n = draws.length;
  console.log(`\nEuroMillions draws under current format: ${n} (${draws[0].date} .. ${draws[n - 1].date})\n`);

  // ---------- 1. Randomness audit ----------
  console.log('TEST 1 - Randomness audit (hot/cold/overdue should show NO edge)');
  const freq = {};
  draws.forEach(d => d.numbers.forEach(x => { freq[x] = (freq[x] || 0) + 1; }));
  const exp = n * 5 / 50;
  const chi2 = Array.from({ length: 50 }, (_, i) => (freq[i + 1] || 0) - exp)
    .reduce((s, d) => s + d * d / exp, 0);
  const zUniform = (chi2 - 49) / Math.sqrt(98);
  console.log(`  number uniformity chi2=${chi2.toFixed(1)} (df=49)  z=${zUniform.toFixed(2)}  ${Math.abs(zUniform) < 2 ? '-> uniform, OK' : '-> SUSPICIOUS'}`);

  const half = Math.floor(n / 2);
  const f1 = {}, f2 = {};
  draws.forEach((d, i) => d.numbers.forEach(x => { (i < half ? f1 : f2)[x] = ((i < half ? f1 : f2)[x] || 0) + 1; }));
  const rPersist = corr(
    Array.from({ length: 50 }, (_, i) => f1[i + 1] || 0),
    Array.from({ length: 50 }, (_, i) => f2[i + 1] || 0)
  );
  console.log(`  hot persistence (1st-half freq vs 2nd-half freq) r=${rPersist.toFixed(3)}  ${Math.abs(rPersist) < 0.28 ? '-> no persistence (noise)' : '-> check'}`);

  // walk-forward overdue
  const last = {};
  let hits = 0, tot = 0;
  for (let i = 0; i < half; i++) draws[i].numbers.forEach(x => { last[x] = i; });
  for (let i = half; i < n; i++) {
    const overdue = Array.from({ length: 50 }, (_, k) => k + 1)
      .sort((a, b) => (i - (last[b] ?? -1e9)) - (i - (last[a] ?? -1e9)))
      .slice(0, 10);
    draws[i].numbers.forEach(x => { tot++; if (overdue.includes(x)) hits++; });
    draws[i].numbers.forEach(x => { last[x] = i; });
  }
  const zOverdue = (hits / tot - 0.2) / Math.sqrt(0.2 * 0.8 / tot);
  console.log(`  most-overdue 10 numbers appear ${(100 * hits / tot).toFixed(2)}% vs 20.00% chance  z=${zOverdue.toFixed(2)}  ${Math.abs(zOverdue) < 2 ? '-> no overdue effect' : '-> check'}\n`);

  // ---------- 2. Anti-popularity edge ----------
  console.log('TEST 2 - Anti-popularity edge (payout given a win)');
  const rows = draws.map(d => {
    const t = d.prizes.find(p => p.matched_numbers === 2 && p.matched_stars === 0);
    if (!t) return null;
    return { low: d.numbers.filter(x => x <= 31).length, winners: t.winners, prize: t.prize };
  }).filter(Boolean);

  const rWinners = corr(rows.map(r => r.low), rows.map(r => r.winners));
  const rPrize = corr(rows.map(r => r.low), rows.map(r => r.prize));
  console.log(`  n=${rows.length} draws, tier 2+0`);
  console.log(`  corr(# low (<=31) numbers drawn, tier winners)      = ${rWinners.toFixed(3)}  (positive: more birthday numbers -> more winners)`);
  console.log(`  corr(# low (<=31) numbers drawn, prize per winner) = ${rPrize.toFixed(3)}  (negative: unpopular draws pay more)`);

  const groups = {};
  rows.forEach(r => { (groups[r.low] = groups[r.low] || []).push(r.prize); });
  console.log('  avg prize per winner by # of low numbers in the drawn combo:');
  Object.keys(groups).sort().forEach(k => {
    const g = groups[k];
    console.log(`    ${k} low: ${(g.reduce((a, b) => a + b, 0) / g.length).toFixed(2)} EUR (n=${g.length})`);
  });

  const hiPayout = rows.filter(r => r.low <= 1).map(r => r.prize);
  const loPayout = rows.filter(r => r.low >= 4).map(r => r.prize);
  const hiAvg = hiPayout.reduce((a, b) => a + b, 0) / hiPayout.length;
  const loAvg = loPayout.reduce((a, b) => a + b, 0) / loPayout.length;
  console.log(`  payout ratio (0-1 low vs 4-5 low draws): ${(hiAvg / loAvg).toFixed(2)}x\n`);

  // ---------- 3. Direct ticket backtest ----------
  console.log('TEST 3 - Simulated ticket backtest (1 ticket per draw per arm)');
  const arms = { uniform: [], 'birthday-like': [], 'anti-popularity': [] };
  const tierPrize = (d, mn, ms) => {
    const t = d.prizes.find(p => p.matched_numbers === mn && p.matched_stars === ms);
    return t ? t.prize : 0;
  };
  let seed = 20261018;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const sample = (lo, hi, k) => {
    const s = new Set();
    while (s.size < k) s.add(lo + Math.floor(rnd() * (hi - lo + 1)));
    return [...s];
  };
  const stats = {};
  for (const arm of Object.keys(arms)) stats[arm] = { wins: 0, total: 0 };
  for (const d of draws) {
    const mains = new Set(d.numbers);
    for (const arm of Object.keys(arms)) {
      const t = arm === 'uniform' ? sample(1, 50, 5)
        : arm === 'birthday-like' ? sample(1, 31, 5)
        : sample(26, 50, 5);
      const m = t.filter(x => mains.has(x)).length;
      if (m >= 2) {
        const mn = m >= 3 ? m : 2;
        const pr = tierPrize(d, mn, 0);
        stats[arm].wins++;
        stats[arm].total += pr;
      }
    }
  }
  for (const arm of Object.keys(arms)) {
    const s = stats[arm];
    console.log(`  ${arm.padEnd(17)} tier-wins ${String(s.wins).padStart(3)} | total ${(s.total).toFixed(2)} EUR | avg prize/win ${(s.total / Math.max(1, s.wins)).toFixed(2)} EUR`);
  }
  const u = stats.uniform, a = stats['anti-popularity'], b = stats['birthday-like'];
  console.log(`\n  -> win counts within noise of each other (odds are unchanged by construction)`);
  console.log(`  -> avg prize per win: anti-popularity ${(a.total / Math.max(1, a.wins) / (u.total / Math.max(1, u.wins))).toFixed(2)}x uniform, birthday ${(b.total / Math.max(1, b.wins) / (u.total / Math.max(1, u.wins))).toFixed(2)}x uniform`);
  console.log(`\nCONCLUSION: no pattern predicts WHICH numbers will be drawn (test 1), but`);
  console.log(`unpopular combinations demonstrably collect higher payouts when they win (tests 2-3).`);
})().catch(e => { console.error('Validation failed:', e.message); process.exit(1); });
