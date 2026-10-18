const DataAcquisition = require('./dataAcquisition');
const StatisticalAnalysis = require('./statisticalAnalysis');
const NumberGenerator = require('./numberGenerator');
const DataStorage = require('./dataStorage');
const PurchaseInfo = require('./purchaseInfo');
const UnpopularityGenerator = require('./unpopularityGenerator');
const EvCalculator = require('./evCalculator');
const DrawSchedule = require('./drawSchedule');
require('dotenv').config();

class LotteryAutomation {
  constructor() {
    this.apiKey = process.env.LOTTERY_API_KEY;
    this.apiUrl = process.env.LOTTERY_API_URL;
    this.dataAcquisition = new DataAcquisition(this.apiKey, this.apiUrl);
    this.dataStorage = new DataStorage();
    this.drawSchedule = new DrawSchedule();
    this.userTimezone = process.env.USER_TIMEZONE || 'Asia/Taipei'; // Default to Taipei
  }

  async runSingleLottery(lotteryType, fetchLimit = 3000, jackpot = null) {
    try {
      console.log(`🎯 Target Lottery: ${lotteryType.toUpperCase()}\n`);

      console.log('📊 Fetching Historical Data...');
      console.log('─'.repeat(60));
      const data = await this.dataAcquisition.fetchAndSave(lotteryType, fetchLimit);
      console.log(`✓ Loaded ${data.draws.length} historical draws\n`);

      console.log('📈 Performing Statistical Analysis...');
      console.log('─'.repeat(60));
      const analyzer = new StatisticalAnalysis(data);
      const analysis = analyzer.generateFullAnalysis();
      await this.dataStorage.saveAnalysis(analysis, lotteryType);

      console.log('Analysis Summary:');
      console.log(`  • Hot Numbers: ${analysis.mainNumbers.hot.slice(0, 5).map(h => h.number).join(', ')}`);
      console.log(`  • Cold Numbers: ${analysis.mainNumbers.cold.slice(0, 5).map(c => c.number).join(', ')}`);
      console.log(`  • Most Overdue: ${analysis.mainNumbers.overdue.slice(0, 5).map(o => o.number).join(', ')}`);
      console.log(`  • Odd/Even Ratio: ${analysis.patterns.oddEven.oddPercentage}% / ${analysis.patterns.oddEven.evenPercentage}%`);
      console.log(`  • Common Pairs Found: ${analysis.patterns.commonPairs.length}\n`);

      console.log('🎲 Generating Optimized Number Combinations...');
      console.log('─'.repeat(60));
      const generator = new NumberGenerator(analysis, lotteryType);
      const topPicks = generator.generateTopPicks(3);

      // Anti-popularity pick: the only optimization with a validated edge
      // (higher payout per win, NOT higher win odds - see scripts/validate-popularity.js)
      const unpopularityGenerator = new UnpopularityGenerator(analysis, lotteryType);
      const lastDrawNumbers = (data.draws && data.draws[0] && data.draws[0].numbers) ? data.draws[0].numbers : [];
      const unpopularityPick = unpopularityGenerator.generatePick(lastDrawNumbers);

      // Optional EV gate: --jackpot <millions>
      let evSummary = null;
      if (jackpot && jackpot > 0) {
        const evCalc = new EvCalculator(lotteryType);
        evSummary = evCalc.estimateEv(jackpot * 1e6);
      }

      const predictions = {
        lottery: lotteryType,
        generatedAt: new Date().toISOString(),
        basedOnDraws: analysis.totalDraws,
        dateRange: analysis.dateRange,
        recommendedPick: unpopularityPick,
        picks: topPicks
      };

      await this.dataStorage.savePredictions(predictions, lotteryType);

      console.log(`\n✅ ${lotteryType.toUpperCase()} - API DATA SUCCESSFULLY RETRIEVED AND ANALYZED`);

      // Show when to run next
      const recommendation = this.drawSchedule.getRecommendedRunTime(
        data.fetchedAt,
        lotteryType,
        this.userTimezone
      );

      if (recommendation) {
        console.log(`\n⏰ ${recommendation.message}`);
      }

      if (evSummary) {
        const evCalc = new EvCalculator(lotteryType);
        console.log(evCalc.formatEv(evSummary));
      }

      return {
        analysis,
        predictions,
        topPicks,
        generator,
        unpopularityPick,
        unpopularityGenerator
      };

    } catch (error) {
      console.error(`❌ Error processing ${lotteryType}:`, error.message);
      throw error;
    }
  }

  async runAllThreeLotteries(fetchLimit = 3000, jackpot = null) {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║      LOTTERY AUTOMATION - INTELLIGENT PREDICTOR        ║');
    console.log('║    POWERBALL • MEGA MILLIONS • EUROMILLIONS ANALYZER   ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const results = {};

    try {
      const powerballResult = await this.runSingleLottery('powerball', fetchLimit, jackpot);
      results.powerball = powerballResult;

      console.log('\n' + '═'.repeat(60) + '\n');

      const megaMillionsResult = await this.runSingleLottery('megamillions', fetchLimit, jackpot);
      results.megamillions = megaMillionsResult;

      console.log('\n' + '═'.repeat(60) + '\n');

      const euroMillionsResult = await this.runSingleLottery('euromillions', fetchLimit, jackpot);
      results.euromillions = euroMillionsResult;

      console.log('\n\n');
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║             TOP 3 PICKS - ALL THREE LOTTERIES          ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      console.log('█████████████████████████████████████████████████████████');
      console.log('                    POWERBALL PICKS');
      console.log('█████████████████████████████████████████████████████████\n');

      this.printPicks(results.powerball);

      console.log('█████████████████████████████████████████████████████████');
      console.log('                  MEGA MILLIONS PICKS');
      console.log('█████████████████████████████████████████████████████████\n');

      this.printPicks(results.megamillions);

      console.log('█████████████████████████████████████████████████████████');
      console.log('                   EUROMILLIONS PICKS');
      console.log('█████████████████████████████████████████████████████████\n');

      this.printPicks(results.euromillions);

      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║              WHERE TO PURCHASE TICKETS                 ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      const purchaseInfo = PurchaseInfo.formatPurchaseInfo('all', 'International');
      console.log(purchaseInfo);

      console.log('✅ AUTOMATION COMPLETE!\n');
      console.log('💡 Tips:');
      console.log('  • Draws are random: no tool can predict winning numbers - including this one');
      console.log('  • Lottery draws are random - past patterns don\'t guarantee future results');
      console.log('  • Play responsibly and within your budget');
      console.log('  • Good luck! 🍀\n');

      // Show next recommended run times for all lotteries
      this.showNextRunSchedule(['powerball', 'megamillions', 'euromillions']);

      return results;

    } catch (error) {
      console.error('❌ Error running automation:', error.message);
      throw error;
    }
  }

  async runBothLotteries(fetchLimit = 3000, jackpot = null) {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║      LOTTERY AUTOMATION - INTELLIGENT PREDICTOR        ║');
    console.log('║           POWERBALL & MEGA MILLIONS ANALYZER           ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const results = {};

    try {
      const powerballResult = await this.runSingleLottery('powerball', fetchLimit, jackpot);
      results.powerball = powerballResult;

      console.log('\n' + '═'.repeat(60) + '\n');

      const megaMillionsResult = await this.runSingleLottery('megamillions', fetchLimit, jackpot);
      results.megamillions = megaMillionsResult;

      console.log('\n\n');
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║             TOP 3 PICKS - BOTH LOTTERIES               ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      console.log('█████████████████████████████████████████████████████████');
      console.log('                    POWERBALL PICKS');
      console.log('█████████████████████████████████████████████████████████\n');

      this.printPicks(results.powerball);

      console.log('█████████████████████████████████████████████████████████');
      console.log('                  MEGA MILLIONS PICKS');
      console.log('█████████████████████████████████████████████████████████\n');

      this.printPicks(results.megamillions);

      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║              WHERE TO PURCHASE TICKETS                 ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      const purchaseInfo = PurchaseInfo.formatPurchaseInfo('both', 'US');
      console.log(purchaseInfo);

      console.log('✅ AUTOMATION COMPLETE!\n');
      console.log('💡 Tips:');
      console.log('  • Draws are random: no tool can predict winning numbers - including this one');
      console.log('  • Lottery draws are random - past patterns don\'t guarantee future results');
      console.log('  • Play responsibly and within your budget');
      console.log('  • Good luck! 🍀\n');

      return results;

    } catch (error) {
      console.error('❌ Error running automation:', error.message);
      throw error;
    }
  }

  async run(lotteryType = 'all', fetchLimit = 3000, jackpot = null) {
    if (lotteryType === 'all') {
      return await this.runAllThreeLotteries(fetchLimit, jackpot);
    } else if (lotteryType === 'both') {
      return await this.runBothLotteries(fetchLimit, jackpot);
    } else {
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║      LOTTERY AUTOMATION - INTELLIGENT PREDICTOR        ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      const result = await this.runSingleLottery(lotteryType, fetchLimit, jackpot);

      console.log('\n');
      console.log('═══════════════════════════════════════════════════════');
      console.log('           TOP 3 RECOMMENDED NUMBER PICKS');
      console.log('═══════════════════════════════════════════════════════');

      this.printPicks(result);

      console.log('📍 Purchase Information...');
      console.log('─'.repeat(60));
      const purchaseInfo = PurchaseInfo.formatPurchaseInfo(lotteryType, 'US');
      console.log(purchaseInfo);

      console.log('✅ AUTOMATION COMPLETE!\n');
      console.log('💡 Tips:');
      console.log('  • Draws are random: no tool can predict winning numbers - including this one');
      console.log('  • Lottery draws are random - past patterns don\'t guarantee future results');
      console.log('  • Play responsibly and within your budget');
      console.log('  • Good luck! 🍀\n');

      return result;
    }
  }

  /**
   * Print the validated anti-popularity pick first, then the legacy
   * pattern-based picks (kept for comparison - they have no predictive edge).
   */
  printPicks(result) {
    if (result.unpopularityPick) {
      console.log(result.unpopularityGenerator.formatPick(result.unpopularityPick, 0));
      console.log('  (Legacy pattern picks below are shown for comparison only -');
      console.log('   validated to have no predictive power. Any combination');
      console.log('   is equally likely to be drawn.)');
    }
    result.topPicks.forEach((pick, idx) => {
      console.log(result.generator.formatPick(pick, idx + 1));
    });
  }

  async fetchOnly(lotteryType = 'powerball', limit = 3000) {
    console.log(`Fetching data for ${lotteryType}...`);
    const data = await this.dataAcquisition.fetchAndSave(lotteryType, limit);
    console.log(`✓ Fetched and saved ${data.draws.length} draws`);
    return data;
  }

  async analyzeOnly(lotteryType = 'powerball') {
    console.log(`Analyzing existing data for ${lotteryType}...`);
    const data = await this.dataAcquisition.loadData(lotteryType);

    if (!data) {
      throw new Error('No data found. Run with --fetch first.');
    }

    const analyzer = new StatisticalAnalysis(data);
    const analysis = analyzer.generateFullAnalysis();
    await this.dataStorage.saveAnalysis(analysis, lotteryType);

    console.log('✓ Analysis complete');
    return analysis;
  }

  /**
   * Show next recommended run schedule for specified lotteries
   */
  async showNextRunSchedule(lotteries) {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║           WHEN TO RUN NEXT (Your Local Time)          ║');
    console.log(`║           Timezone: ${this.userTimezone.padEnd(35)} ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    for (const lotteryType of lotteries) {
      const data = await this.dataAcquisition.loadData(lotteryType);
      const recommendation = this.drawSchedule.getRecommendedRunTime(
        data?.fetchedAt,
        lotteryType,
        this.userTimezone
      );

      if (recommendation) {
        console.log(`${recommendation.lotteryName.toUpperCase()}`);
        console.log('─'.repeat(60));
        console.log(`Last Updated: ${recommendation.lastFetchedAt}`);
        console.log(`Draw Days: ${recommendation.drawDays}`);
        console.log(`${recommendation.message}\n`);
      }
    }

    // Show optimal weekly schedule
    const optimalSchedule = this.drawSchedule.getOptimalWeeklySchedule(this.userTimezone);
    console.log('📆 OPTIMAL WEEKLY SCHEDULE');
    console.log('─'.repeat(60));
    console.log(`${optimalSchedule.recommendation}\n`);

    optimalSchedule.optimalDays.forEach((day, idx) => {
      console.log(`${idx + 1}. ${day.day} - ${day.reason}`);
      console.log(`   Lotteries: ${day.lotteries.join(', ')}\n`);
    });

    console.log('💡 TIP: Run "node src/index.js all" on these days for fresh data!\n');
  }

  /**
   * Show draw schedules only
   */
  showSchedules() {
    const summary = this.drawSchedule.formatScheduleSummary(this.userTimezone);
    console.log(summary);

    const optimalSchedule = this.drawSchedule.getOptimalWeeklySchedule(this.userTimezone);
    console.log('📆 RECOMMENDED AUTOMATION SCHEDULE');
    console.log('─'.repeat(60));
    console.log(`${optimalSchedule.recommendation}\n`);

    optimalSchedule.optimalDays.forEach((day, idx) => {
      console.log(`${idx + 1}. ${day.day}`);
      console.log(`   ${day.reason}`);
      console.log(`   Covers: ${day.lotteries.join(', ')}\n`);
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const lotteryType = args.find(arg => !arg.startsWith('--')) || 'all';
  const fetchFlag = args.includes('--fetch');
  const analyzeFlag = args.includes('--analyze');
  const scheduleFlag = args.includes('--schedule');
  const jackpotIdx = args.indexOf('--jackpot');
  const jackpot = jackpotIdx !== -1 ? parseFloat(args[jackpotIdx + 1]) : null;

  const automation = new LotteryAutomation();

  try {
    if (scheduleFlag) {
      automation.showSchedules();
    } else if (fetchFlag) {
      await automation.fetchOnly(lotteryType);
    } else if (analyzeFlag) {
      await automation.analyzeOnly(lotteryType);
    } else {
      await automation.run(lotteryType, 3000, jackpot);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = LotteryAutomation;
