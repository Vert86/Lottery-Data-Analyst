const DataAcquisition = require('./dataAcquisition');
const StatisticalAnalysis = require('./statisticalAnalysis');
const NumberGenerator = require('./numberGenerator');
const DataStorage = require('./dataStorage');
const PurchaseInfo = require('./purchaseInfo');
require('dotenv').config();

class LotteryAutomation {
  constructor() {
    this.apiKey = process.env.LOTTERY_API_KEY;
    this.apiUrl = process.env.LOTTERY_API_URL;
    this.dataAcquisition = new DataAcquisition(this.apiKey, this.apiUrl);
    this.dataStorage = new DataStorage();
  }

  async runSingleLottery(lotteryType, fetchLimit = 100) {
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

      const predictions = {
        lottery: lotteryType,
        generatedAt: new Date().toISOString(),
        basedOnDraws: analysis.totalDraws,
        dateRange: analysis.dateRange,
        picks: topPicks
      };

      await this.dataStorage.savePredictions(predictions, lotteryType);

      return {
        analysis,
        predictions,
        topPicks,
        generator
      };

    } catch (error) {
      console.error(`❌ Error processing ${lotteryType}:`, error.message);
      throw error;
    }
  }

  async runBothLotteries(fetchLimit = 100) {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║      LOTTERY AUTOMATION - INTELLIGENT PREDICTOR        ║');
    console.log('║           POWERBALL & MEGA MILLIONS ANALYZER           ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const results = {};

    try {
      const powerballResult = await this.runSingleLottery('powerball', fetchLimit);
      results.powerball = powerballResult;

      console.log('\n' + '═'.repeat(60) + '\n');

      const megaMillionsResult = await this.runSingleLottery('megamillions', fetchLimit);
      results.megamillions = megaMillionsResult;

      console.log('\n\n');
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║             TOP 3 PICKS - BOTH LOTTERIES               ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      console.log('█████████████████████████████████████████████████████████');
      console.log('                    POWERBALL PICKS');
      console.log('█████████████████████████████████████████████████████████\n');

      results.powerball.topPicks.forEach((pick, idx) => {
        console.log(results.powerball.generator.formatPick(pick, idx));
      });

      console.log('█████████████████████████████████████████████████████████');
      console.log('                  MEGA MILLIONS PICKS');
      console.log('█████████████████████████████████████████████████████████\n');

      results.megamillions.topPicks.forEach((pick, idx) => {
        console.log(results.megamillions.generator.formatPick(pick, idx));
      });

      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║              WHERE TO PURCHASE TICKETS                 ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      const purchaseInfo = PurchaseInfo.formatPurchaseInfo('both', 'US');
      console.log(purchaseInfo);

      console.log('✅ AUTOMATION COMPLETE!\n');
      console.log('💡 Tips:');
      console.log('  • These predictions are based on statistical analysis');
      console.log('  • Lottery draws are random - past patterns don\'t guarantee future results');
      console.log('  • Play responsibly and within your budget');
      console.log('  • Good luck! 🍀\n');

      return results;

    } catch (error) {
      console.error('❌ Error running automation:', error.message);
      throw error;
    }
  }

  async run(lotteryType = 'both', fetchLimit = 100) {
    if (lotteryType === 'both') {
      return await this.runBothLotteries(fetchLimit);
    } else {
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║      LOTTERY AUTOMATION - INTELLIGENT PREDICTOR        ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');

      const result = await this.runSingleLottery(lotteryType, fetchLimit);

      console.log('\n');
      console.log('═══════════════════════════════════════════════════════');
      console.log('           TOP 3 RECOMMENDED NUMBER PICKS');
      console.log('═══════════════════════════════════════════════════════');

      result.topPicks.forEach((pick, idx) => {
        console.log(result.generator.formatPick(pick, idx));
      });

      console.log('📍 Purchase Information...');
      console.log('─'.repeat(60));
      const purchaseInfo = PurchaseInfo.formatPurchaseInfo(lotteryType, 'US');
      console.log(purchaseInfo);

      console.log('✅ AUTOMATION COMPLETE!\n');
      console.log('💡 Tips:');
      console.log('  • These predictions are based on statistical analysis');
      console.log('  • Lottery draws are random - past patterns don\'t guarantee future results');
      console.log('  • Play responsibly and within your budget');
      console.log('  • Good luck! 🍀\n');

      return result;
    }
  }

  async fetchOnly(lotteryType = 'powerball', limit = 100) {
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
}

async function main() {
  const args = process.argv.slice(2);
  const lotteryType = args.find(arg => !arg.startsWith('--')) || 'both';
  const fetchFlag = args.includes('--fetch');
  const analyzeFlag = args.includes('--analyze');

  const automation = new LotteryAutomation();

  try {
    if (fetchFlag) {
      await automation.fetchOnly(lotteryType);
    } else if (analyzeFlag) {
      await automation.analyzeOnly(lotteryType);
    } else {
      await automation.run(lotteryType);
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
