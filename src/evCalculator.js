/**
 * Expected-value calculator for lottery tickets.
 *
 * The honest framing this tool enforces: a $2 Powerball ticket has roughly
 * $0.32 of expected value from the fixed lower tiers alone, so the jackpot is
 * what determines whether the total EV is -85% or -40%. It never reaches
 * positive territory in practice because of:
 *   1. lump-sum discount (advertised jackpots are annuity values, cash ~52%)
 *   2. taxes (~37% top US federal bracket + state)
 *   3. jackpot splitting with co-winners (Poisson model below)
 *
 * Use this module to decide WHEN a draw is least-bad to play, not whether
 * playing is +EV.
 */

class EvCalculator {
  constructor(lotteryType) {
    this.lotteryType = lotteryType;
    this.profile = EvCalculator.profiles[lotteryType];
    if (!this.profile) throw new Error(`No EV profile for ${lotteryType}`);
  }

  // Fixed (PB/MM) or long-run average (EM, pari-mutuel) lower-tier prizes.
  static profiles = {
    powerball: {
      ticketPrice: 2,
      jackpotOdds: 292201338,
      lowerTierEv: 0.32, // fixed prizes, per ticket
      currency: 'USD'
    },
    megamillions: {
      ticketPrice: 2,
      jackpotOdds: 302575350,
      lowerTierEv: 0.25, // fixed prizes, per ticket
      currency: 'USD'
    },
    euromillions: {
      ticketPrice: 2.5,
      jackpotOdds: 139838160,
      lowerTierEv: 1.00, // long-run average pari-mutuel prizes 2016-2026, per ticket
      currency: 'EUR',
      cashRatio: 1.0,   // EM jackpots are advertised as LUMP SUM already (no annuity)
      taxRate: 0.0,     // prize tax-free in most participating countries (exceptions exist)
      jackpotCap: 250e6 // prize cap: excess rolls down to lower tiers
    }
  };

  /**
   * @param {number} jackpotAdvertised  advertised (annuity) jackpot in currency units
   * @param {object} opts
   * @param {number} [opts.cashRatio=0.52]   annuity -> lump-sum conversion
   * @param {number} [opts.ticketsSold]      estimated tickets sold for this draw
   * @param {number} [opts.comboPopularity=1] relative popularity of OUR combo
   *        (average=1, anti-popularity ~0.2-0.5, birthday-heavy 2-4+)
   * @param {number} [opts.taxRate=0.37]     marginal tax on winnings, optional
   */
  estimateEv(jackpotAdvertised, opts = {}) {
    const prof = this.profile;
    const {
      cashRatio = prof.cashRatio ?? 0.52,
      ticketsSold = this.defaultTicketsSold(jackpotAdvertised),
      comboPopularity = 1,
      taxRate = prof.taxRate ?? 0.37
    } = opts;

    const p = this.profile;
    const cashJackpot = jackpotAdvertised * cashRatio * (1 - taxRate);
    const afterTax = cashJackpot;

    // Poisson model of co-winners: players who buy the winning combo independent
    // of ours buy ~ ticketsSold / jackpotOdds of them; scaled by how popular our
    // specific combo is relative to average.
    const lambda = Math.max(1e-9, ticketsSold / p.jackpotOdds * comboPopularity);
    // E[our share | we win], co-winners ~ Poisson(lambda)
    const expectedShare = lambda > 1e-6 ? (1 - Math.exp(-lambda)) / lambda : 1;

    const jackpotEv = afterTax / p.jackpotOdds * expectedShare;
    const totalEv = p.lowerTierEv + jackpotEv;

    return {
      lottery: this.lotteryType,
      currency: p.currency,
      ticketPrice: p.ticketPrice,
      advertisedJackpot: jackpotAdvertised,
      cashAfterTax: Math.round(afterTax),
      ticketsSoldEstimate: Math.round(ticketsSold),
      expectedCoWinners: lambda,
      expectedShare: expectedShare,
      lowerTierEv: p.lowerTierEv,
      jackpotEv: jackpotEv,
      totalEv: totalEv,
      evPerUnitStake: totalEv / p.ticketPrice,
      evPercent: (totalEv / p.ticketPrice - 1) * 100,
      verdict: totalEv >= p.ticketPrice
        ? 'positive EV (extremely rare - verify inputs)'
        : `EV ${(100 * (totalEv / p.ticketPrice)).toFixed(0)}% of stake: every ticket bought loses ~${(100 - 100 * totalEv / p.ticketPrice).toFixed(0)}% on average. Entertainment only.`
    };
  }

  // Rough ticket-sales scaling: bigger jackpots draw bigger sales.
  defaultTicketsSold(jackpotAdvertised) {
    if (!jackpotAdvertised || jackpotAdvertised <= 0) return 0;
    const { ticketPrice, jackpotOdds } = this.profile;
    return Math.min(
      3e8,
      Math.max(1e6, (jackpotAdvertised / (25 * ticketPrice)))
    );
  }

  formatEv(e) {
    const cur = e.currency;
    const fmt = n => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return `
${'─'.repeat(59)}
Expected Value Breakdown (${e.lottery.toUpperCase()}, ticket ${cur} ${e.ticketPrice})
  Advertised jackpot:      ${cur} ${fmt(e.advertisedJackpot)} (annuity)
  Cash after lump-sum+tax: ${cur} ${fmt(e.cashAfterTax)}
  Est. co-winners if you win the jackpot: ${e.expectedCoWinners.toFixed(2)}
  Your expected jackpot share: ${e.expectedShare.toFixed(2)}
  Lower-tier EV:            ${cur} ${e.lowerTierEv.toFixed(2)}
  Jackpot EV:               ${cur} ${e.jackpotEv.toFixed(2)}
  TOTAL EV per ticket:      ${cur} ${e.totalEv.toFixed(2)} (${e.evPercent >= 0 ? '+' : ''}${e.evPercent.toFixed(0)}% of stake)
  ${e.verdict}
${'─'.repeat(59)}`;
  }
}

module.exports = EvCalculator;
