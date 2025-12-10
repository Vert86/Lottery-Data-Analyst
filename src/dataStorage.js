const fs = require('fs').promises;
const path = require('path');

class DataStorage {
  constructor(dataDir = path.join(__dirname, '../data')) {
    this.dataDir = dataDir;
    this.analysisDir = path.join(dataDir, 'analysis');
  }

  async ensureDirectories() {
    await fs.mkdir(this.dataDir, { recursive: true });
    await fs.mkdir(this.analysisDir, { recursive: true });
  }

  async saveAnalysis(analysis, lotteryType) {
    await this.ensureDirectories();
    const filename = path.join(this.analysisDir, `${lotteryType}_analysis.json`);

    try {
      await fs.writeFile(filename, JSON.stringify(analysis, null, 2));
      console.log(`Analysis saved to ${filename}`);
      return filename;
    } catch (error) {
      console.error('Error saving analysis:', error.message);
      throw error;
    }
  }

  async loadAnalysis(lotteryType) {
    const filename = path.join(this.analysisDir, `${lotteryType}_analysis.json`);

    try {
      const data = await fs.readFile(filename, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.log(`No existing analysis found for ${lotteryType}`);
      return null;
    }
  }

  async savePredictions(predictions, lotteryType) {
    await this.ensureDirectories();
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = path.join(this.analysisDir, `${lotteryType}_predictions_${timestamp}.json`);

    try {
      await fs.writeFile(filename, JSON.stringify(predictions, null, 2));
      console.log(`Predictions saved to ${filename}`);
      return filename;
    } catch (error) {
      console.error('Error saving predictions:', error.message);
      throw error;
    }
  }

  async getLatestPredictions(lotteryType) {
    try {
      const files = await fs.readdir(this.analysisDir);
      const predictionFiles = files
        .filter(f => f.startsWith(`${lotteryType}_predictions_`))
        .sort()
        .reverse();

      if (predictionFiles.length === 0) return null;

      const latestFile = path.join(this.analysisDir, predictionFiles[0]);
      const data = await fs.readFile(latestFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.log('No predictions found');
      return null;
    }
  }
}

module.exports = DataStorage;
