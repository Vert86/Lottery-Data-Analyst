const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class DataAcquisition {
  constructor(apiKey, apiUrl) {
    this.apiKey = apiKey || 'demo';
    this.apiUrl = apiUrl || 'https://api.apiverve.com/v1/lottery';
    this.dataDir = path.join(__dirname, '../data');
  }

  async ensureDataDirectory() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Error creating data directory:', error.message);
    }
  }

  async fetchHistoricalData(lotteryType = 'powerball', limit = 100) {
    console.log(`Fetching historical data for ${lotteryType}...`);

    try {
      // Sample structure - adapt based on actual API
      const response = await axios.get(`${this.apiUrl}/${lotteryType}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit: limit
        },
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      console.log('API fetch failed, using sample data for demonstration...');
      return this.generateSampleData(lotteryType, limit);
    }
  }

  generateSampleData(lotteryType, count) {
    const draws = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
      const drawDate = new Date(today);
      drawDate.setDate(drawDate.getDate() - (i * 3)); // Every 3 days

      let numbers, powerball, maxNumber;

      if (lotteryType === 'powerball') {
        maxNumber = 69;
        powerball = Math.floor(Math.random() * 26) + 1;
        numbers = this.generateUniqueNumbers(5, maxNumber);
        draws.push({
          date: drawDate.toISOString().split('T')[0],
          numbers: numbers.sort((a, b) => a - b),
          powerball: powerball,
          jackpot: Math.floor(Math.random() * 500000000) + 20000000
        });
      } else if (lotteryType === 'megamillions') {
        maxNumber = 70;
        powerball = Math.floor(Math.random() * 25) + 1;
        numbers = this.generateUniqueNumbers(5, maxNumber);
        draws.push({
          date: drawDate.toISOString().split('T')[0],
          numbers: numbers.sort((a, b) => a - b),
          megaball: powerball,
          jackpot: Math.floor(Math.random() * 400000000) + 15000000
        });
      } else {
        maxNumber = 50;
        numbers = this.generateUniqueNumbers(6, maxNumber);
        draws.push({
          date: drawDate.toISOString().split('T')[0],
          numbers: numbers.sort((a, b) => a - b),
          jackpot: Math.floor(Math.random() * 100000000) + 5000000
        });
      }
    }

    return {
      lottery: lotteryType,
      count: draws.length,
      draws: draws
    };
  }

  generateUniqueNumbers(count, max) {
    const numbers = new Set();
    while (numbers.size < count) {
      numbers.add(Math.floor(Math.random() * max) + 1);
    }
    return Array.from(numbers);
  }

  async saveData(data, lotteryType) {
    await this.ensureDataDirectory();
    const filename = path.join(this.dataDir, `${lotteryType}_history.json`);

    try {
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      console.log(`Data saved to ${filename}`);
      return filename;
    } catch (error) {
      console.error('Error saving data:', error.message);
      throw error;
    }
  }

  async loadData(lotteryType) {
    const filename = path.join(this.dataDir, `${lotteryType}_history.json`);

    try {
      const data = await fs.readFile(filename, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.log(`No existing data found for ${lotteryType}`);
      return null;
    }
  }

  async fetchAndSave(lotteryType = 'powerball', limit = 100) {
    const data = await this.fetchHistoricalData(lotteryType, limit);
    await this.saveData(data, lotteryType);
    return data;
  }
}

module.exports = DataAcquisition;
