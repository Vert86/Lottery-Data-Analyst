# Lottery Automation System 🎰

A production-ready, intelligent lottery analysis and number generation system that uses **REAL historical data** to identify patterns and generate optimized number combinations for Powerball and Mega Millions.

## 🌟 Features

- **Real Data Acquisition**: Fetches actual historical lottery data from official sources
  - Primary: NY.gov Open Data (FREE, no API key required)
  - Fallback: LotteryData.io (optional paid service)
  - Last resort: Sample data for testing
- **Statistical Analysis**: Analyzes frequency, hot/cold numbers, overdue numbers, and common pairs
- **Smart Generation**: Creates optimized number combinations using multiple strategies:
  - Balanced Mix: Weighted selection combining hot, cold, and overdue numbers
  - Hot Numbers Focus: Prioritizes frequently drawn numbers
  - Overdue Numbers: Focuses on numbers due for appearance
- **Balance Metrics**: Validates odd/even and high/low ratios
- **Purchase Guidance**: Provides verified courier services for ticket purchase

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure (Optional)
```bash
cp .env.example .env
# No configuration needed for free NY.gov data source!
# Edit .env only if you want to use LotteryData.io
```

### 3. Run the Automation
```bash
npm start
```

## 📖 Usage

### Run Both Lotteries (Default)
```bash
npm start
```

### Run Single Lottery
```bash
node src/index.js powerball
node src/index.js megamillions
```

### Fetch Data Only
```bash
npm run fetch
```

### Analyze Existing Data
```bash
npm run analyze
```

## 🔌 Data Sources

The system uses a **multi-tier fallback architecture** for maximum reliability:

### Tier 1: NY.gov Open Data (FREE - Default)
- **No API key required**
- Official New York State lottery data
- Powerball data since 2010
- Mega Millions data since 2002
- API endpoints:
  - Powerball: `https://data.ny.gov/resource/d6yy-54nr.json`
  - Mega Millions: `https://data.ny.gov/resource/5xaw-6ayf.json`

### Tier 2: LotteryData.io (Optional)
- Requires API key from [LotteryData.io](https://www.lotterydata.io/)
- Free tier: 50 requests/month
- Paid tier: $29.99/month (20,000 requests)
- Better international coverage

### Tier 3: Sample Data (Automatic Fallback)
- Randomly generated for testing
- Used only if all APIs fail

## 🎯 Example Output

When you run the automation, you'll get:

### Powerball Example
```
Pick #1: Balanced Mix
Numbers: 3, 6, 23, 42, 45 + Powerball: 25
Strategy: Combines hot, cold, and overdue numbers
Balance: ✓ Odd/Even: 3/2, High/Low: 2/3
```

### Mega Millions Example
```
Pick #1: Balanced Mix
Numbers: 14, 18, 20, 27, 36 + Mega Ball: 13
Strategy: Combines hot, cold, and overdue numbers
Balance: ✓ Odd/Even: 1/4, High/Low: 1/4
```

## 🛒 Purchase Locations

Recommended lottery courier services:
- **TheLotter.com** - International coverage (60+ lotteries)
- **Lotto.com** - US official state lottery partner
- **Jackpot.com** - Licensed US service with auto prize collection

## 🏗️ System Architecture

```
src/
├── dataAcquisition.js    # Multi-source data fetching with fallback
├── statisticalAnalysis.js # Pattern detection and frequency analysis
├── numberGenerator.js     # Smart number generation algorithms
├── dataStorage.js        # JSON-based data persistence
├── purchaseInfo.js       # Courier service information
└── index.js             # Main orchestration and CLI
```

## 📊 Analysis Methods

- **Hot Numbers**: Most frequently drawn numbers (weighted heavily)
- **Cold Numbers**: Rarely drawn numbers (balanced inclusion)
- **Overdue Numbers**: Numbers that haven't appeared in longest time
- **Common Pairs**: Number combinations that appear together
- **Common Triplets**: Three-number combinations
- **Odd/Even Ratio**: Distribution balance check
- **High/Low Ratio**: Range distribution check

## 🔒 Data Privacy

- All data is stored locally in JSON files
- No personal information collected
- API calls are read-only
- Open source and transparent

## 🧪 Testing

The system automatically tests API connectivity and falls back gracefully:
1. Attempts NY.gov Open Data (free)
2. Falls back to LotteryData.io (if configured)
3. Uses sample data (last resort for testing)

## ⚠️ Disclaimer

This tool is for **educational and entertainment purposes only**. Lottery drawings are random events, and historical patterns do not guarantee future outcomes. Play responsibly and within your budget.

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 📚 Resources

- [NY.gov Open Data Portal](https://data.ny.gov/)
- [Powerball Official Site](https://www.powerball.com/)
- [Mega Millions Official Site](https://www.megamillions.com/)
- [LotteryData.io API](https://www.lotterydata.io/)
