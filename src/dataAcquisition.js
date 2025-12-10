const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class DataAcquisition {
  constructor(apiKey, apiUrl) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.dataDir = path.join(__dirname, '../data');

    // Multiple API sources for redundancy
    this.apiSources = {
      nyGov: {
        powerball: 'https://data.ny.gov/resource/d6yy-54nr.json',
        megamillions: 'https://data.ny.gov/resource/5xaw-6ayf.json'
      },
      euroMillions: {
        base: 'https://euromillions.api.pedromealha.dev',
        endpoint: '/draws'
      },
      lotteryData: {
        base: 'https://api.lotterydata.io/v1',
        powerball: '/powerball/draws',
        megamillions: '/megamillions/draws'
      }
    };
  }

  async ensureDataDirectory() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Error creating data directory:', error.message);
    }
  }

  /**
   * Fetch from NY.gov Open Data - FREE, no API key required
   */
  async fetchFromNYGov(lotteryType, limit = 100) {
    const url = this.apiSources.nyGov[lotteryType];
    if (!url) {
      throw new Error(`NY.gov source not available for ${lotteryType}`);
    }

    console.log(`📡 Attempting to fetch from NY.gov Open Data API...`);

    try {
      const response = await axios.get(url, {
        params: {
          '$limit': limit,
          '$order': 'draw_date DESC'
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log(`✓ Successfully fetched ${response.data.length} records from NY.gov`);
      return this.transformNYGovData(response.data, lotteryType);
    } catch (error) {
      console.log(`✗ NY.gov fetch failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transform NY.gov data to our standard format
   */
  transformNYGovData(data, lotteryType) {
    const draws = data.map(draw => {
      if (lotteryType === 'powerball') {
        return {
          date: draw.draw_date.split('T')[0],
          numbers: [
            parseInt(draw.winning_numbers.split(' ')[0]),
            parseInt(draw.winning_numbers.split(' ')[1]),
            parseInt(draw.winning_numbers.split(' ')[2]),
            parseInt(draw.winning_numbers.split(' ')[3]),
            parseInt(draw.winning_numbers.split(' ')[4])
          ].sort((a, b) => a - b),
          powerball: parseInt(draw.winning_numbers.split(' ')[5]),
          multiplier: draw.multiplier ? parseInt(draw.multiplier) : null
        };
      } else if (lotteryType === 'megamillions') {
        return {
          date: draw.draw_date.split('T')[0],
          numbers: [
            parseInt(draw.winning_numbers.split(' ')[0]),
            parseInt(draw.winning_numbers.split(' ')[1]),
            parseInt(draw.winning_numbers.split(' ')[2]),
            parseInt(draw.winning_numbers.split(' ')[3]),
            parseInt(draw.winning_numbers.split(' ')[4])
          ].sort((a, b) => a - b),
          megaball: parseInt(draw.mega_ball),
          multiplier: draw.multiplier ? parseInt(draw.multiplier) : null
        };
      }
    });

    return {
      lottery: lotteryType,
      source: 'NY.gov Open Data',
      count: draws.length,
      draws: draws
    };
  }

  /**
   * Fetch from LotteryData.io (if API key provided)
   */
  async fetchFromLotteryData(lotteryType, limit = 100) {
    if (!this.apiKey) {
      throw new Error('LotteryData.io API key not provided');
    }

    const endpoint = this.apiSources.lotteryData[lotteryType];
    const url = `${this.apiSources.lotteryData.base}${endpoint}`;

    console.log(`📡 Attempting to fetch from LotteryData.io...`);

    try {
      const response = await axios.get(url, {
        params: { limit },
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      console.log(`✓ Successfully fetched from LotteryData.io`);
      return this.transformLotteryDataIO(response.data, lotteryType);
    } catch (error) {
      console.log(`✗ LotteryData.io fetch failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transform LotteryData.io response to our format
   */
  transformLotteryDataIO(data, lotteryType) {
    const draws = data.draws || data;

    return {
      lottery: lotteryType,
      source: 'LotteryData.io',
      count: draws.length,
      draws: draws.map(draw => ({
        date: draw.draw_date || draw.date,
        numbers: draw.numbers || draw.winning_numbers,
        powerball: draw.powerball || draw.bonus,
        megaball: draw.mega_ball || draw.bonus,
        multiplier: draw.multiplier
      }))
    };
  }

  /**
   * Fetch from EuroMillions API - FREE, no API key required
   */
  async fetchFromEuroMillions(limit = 100) {
    const url = `${this.apiSources.euroMillions.base}${this.apiSources.euroMillions.endpoint}`;

    console.log(`📡 Attempting to fetch from EuroMillions API...`);

    try {
      const response = await axios.get(url, {
        params: {
          limit: limit
        },
        timeout: 15000,
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log(`✓ Successfully fetched ${response.data.length} records from EuroMillions API`);
      return this.transformEuroMillionsData(response.data);
    } catch (error) {
      console.log(`✗ EuroMillions API fetch failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transform EuroMillions API data to our standard format
   */
  transformEuroMillionsData(data) {
    const draws = data.map(draw => {
      return {
        date: draw.date,
        numbers: draw.numbers.sort((a, b) => a - b),
        stars: draw.stars.sort((a, b) => a - b),
        jackpot: draw.jackpot
      };
    });

    return {
      lottery: 'euromillions',
      source: 'EuroMillions API (pedromealha.dev)',
      count: draws.length,
      draws: draws
    };
  }

  /**
   * Main fetch method with automatic fallback
   */
  async fetchHistoricalData(lotteryType = 'powerball', limit = 100) {
    console.log(`\n🎯 Fetching historical data for ${lotteryType.toUpperCase()}...`);
    console.log(`📊 Requested: ${limit} most recent draws\n`);

    // EuroMillions has its own API source
    if (lotteryType === 'euromillions') {
      const fetchStrategies = [
        {
          name: 'EuroMillions API (FREE)',
          method: () => this.fetchFromEuroMillions(limit)
        },
        {
          name: 'Sample Data (Last Resort)',
          method: () => Promise.resolve(this.generateSampleData(lotteryType, limit))
        }
      ];

      for (const strategy of fetchStrategies) {
        try {
          const data = await strategy.method();
          console.log(`✓ Data acquisition successful via ${strategy.name}\n`);
          return data;
        } catch (error) {
          console.log(`✗ ${strategy.name} failed: ${error.message}`);
          continue;
        }
      }
    }

    // US Lotteries (Powerball, Mega Millions)
    const fetchStrategies = [
      {
        name: 'NY.gov Open Data (FREE)',
        method: () => this.fetchFromNYGov(lotteryType, limit)
      },
      {
        name: 'LotteryData.io (API Key Required)',
        method: () => this.fetchFromLotteryData(lotteryType, limit),
        requiresApiKey: true
      },
      {
        name: 'Sample Data (Last Resort)',
        method: () => Promise.resolve(this.generateSampleData(lotteryType, limit))
      }
    ];

    for (const strategy of fetchStrategies) {
      // Skip strategies that require API key if not provided
      if (strategy.requiresApiKey && !this.apiKey) {
        console.log(`⊘ Skipping ${strategy.name} (no API key provided)`);
        continue;
      }

      try {
        const data = await strategy.method();
        console.log(`✓ Data acquisition successful via ${strategy.name}\n`);
        return data;
      } catch (error) {
        console.log(`✗ ${strategy.name} failed: ${error.message}`);
        continue;
      }
    }

    throw new Error('All data acquisition strategies failed');
  }

  /**
   * Generate sample data (fallback only)
   */
  generateSampleData(lotteryType, count) {
    console.log(`⚠ WARNING: Using randomly generated sample data`);
    console.log(`⚠ This is NOT real lottery data - for testing only!\n`);

    const draws = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
      const drawDate = new Date(today);
      drawDate.setDate(drawDate.getDate() - (i * 3)); // Every 3 days

      let numbers, bonusNumber, maxNumber;

      if (lotteryType === 'powerball') {
        maxNumber = 69;
        bonusNumber = Math.floor(Math.random() * 26) + 1;
        numbers = this.generateUniqueNumbers(5, maxNumber);
        draws.push({
          date: drawDate.toISOString().split('T')[0],
          numbers: numbers.sort((a, b) => a - b),
          powerball: bonusNumber,
          jackpot: Math.floor(Math.random() * 500000000) + 20000000
        });
      } else if (lotteryType === 'megamillions') {
        maxNumber = 70;
        bonusNumber = Math.floor(Math.random() * 25) + 1;
        numbers = this.generateUniqueNumbers(5, maxNumber);
        draws.push({
          date: drawDate.toISOString().split('T')[0],
          numbers: numbers.sort((a, b) => a - b),
          megaball: bonusNumber,
          jackpot: Math.floor(Math.random() * 400000000) + 15000000
        });
      } else if (lotteryType === 'euromillions') {
        maxNumber = 50;
        const stars = this.generateUniqueNumbers(2, 12);
        numbers = this.generateUniqueNumbers(5, maxNumber);
        draws.push({
          date: drawDate.toISOString().split('T')[0],
          numbers: numbers.sort((a, b) => a - b),
          stars: stars.sort((a, b) => a - b),
          jackpot: Math.floor(Math.random() * 200000000) + 17000000
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
      source: 'SAMPLE DATA (NOT REAL)',
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
      const dataWithMetadata = {
        ...data,
        fetchedAt: new Date().toISOString(),
        dataSource: data.source
      };

      await fs.writeFile(filename, JSON.stringify(dataWithMetadata, null, 2));
      console.log(`💾 Data saved to: ${filename}`);
      return filename;
    } catch (error) {
      console.error('❌ Error saving data:', error.message);
      throw error;
    }
  }

  async loadData(lotteryType) {
    const filename = path.join(this.dataDir, `${lotteryType}_history.json`);

    try {
      const data = await fs.readFile(filename, 'utf-8');
      const parsed = JSON.parse(data);
      console.log(`📂 Loaded existing data from: ${filename}`);
      console.log(`   Source: ${parsed.source || 'Unknown'}`);
      console.log(`   Last fetched: ${parsed.fetchedAt || 'Unknown'}`);
      return parsed;
    } catch (error) {
      console.log(`📂 No existing data found for ${lotteryType}`);
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
