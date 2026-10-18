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

### View Draw Schedules
```bash
node src/index.js --schedule
```

Shows lottery draw schedules in your local timezone and recommends when to run the automation next.

## ⏰ Draw Schedule & Recommendations

The system automatically tracks when lottery draws occur and recommends optimal times to run:

### Lottery Draw Times (Taipei Time - UTC+8)
- **Powerball**: Monday, Wednesday, Saturday at ~10:59 AM
- **Mega Millions**: Tuesday, Friday at ~11:00 AM
- **EuroMillions**: Tuesday, Friday at ~4:30 AM

### Recommended Automation Schedule
Run **twice weekly** to capture all lottery draws:
1. **Wednesday** - Captures Monday Powerball + Tuesday Mega Millions & EuroMillions
2. **Saturday** - Captures Wednesday Powerball + Friday Mega Millions & EuroMillions

### Configure Your Timezone
Set your timezone in `.env`:
```bash
USER_TIMEZONE=Asia/Taipei
```

After each run, the system shows when fresh data will be available next!

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

## 🔬 What Actually Works (Validated) vs What Doesn't

This project started as a "pattern predictor". A full statistical audit of real draw data
(Powerball 1,495 draws, Mega Millions 936, EuroMillions 1,050, current formats only)
showed that **no pattern predicts future draws**:

- Number uniformity: chi-square z between -0.6 and 0.0 (perfectly uniform)
- Hot-number persistence: z between +0.3 and +1.3 (noise)
- Overdue numbers walk-forward: z between +0.1 and +1.5 (noise)
- Walk-forward backtest of hot/overdue/balanced strategies: identical hit rate to random tickets

The legacy pattern-based picks are kept for comparison only.

**What IS real: the anti-popularity edge.** You cannot improve P(win), but you can improve
the expected payout given a win. Validated on EuroMillions 2016-2026 (the only source with
per-tier winner counts and prize amounts):

- Prize per winner falls monotonically as winning combos contain more 1-31 (birthday) numbers:
  EUR 4.97 (0-1 low numbers drawn) -> EUR 3.62 (5 low numbers drawn), correlation -0.672
- Anti-popularity tickets collected ~6-7% more per win than uniform tickets in a
  direct per-draw backtest; the effect is larger at jackpot level
- The tool now leads with an anti-popularity pick: skewed to 32+ (un-birthday-able),
  avoiding sequences, patterns, and the previous draw's numbers

Run the full validation yourself:

```bash
node scripts/validate-popularity.js
```

## 💰 Expected Value Gate

Lottery tickets are negative-EV almost always. Check the least-bad time to play:

```bash
node src/index.js powerball --jackpot 800    # $800M advertised jackpot
node src/index.js euromillions --jackpot 240 # EUR 240M jackpot
```

This prints the full EV breakdown: lump-sum + tax discount, Poisson jackpot-split model,
lower-tier EV, and the honest verdict. Even a $1.2B Powerball jackpot is around -20% EV
per ticket after cash discount and taxes.

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

Recommended lottery courier service:
- **TheLotter.com** - International coverage (60+ lotteries worldwide)
  - Best option for international players
  - Supports Powerball, Mega Millions, and EuroMillions
  - Automatic ticket scanning and notifications

## 🏗️ System Architecture

```
src/
├── dataAcquisition.js    # Multi-source data fetching with fallback
├── statisticalAnalysis.js # Pattern detection and frequency analysis
├── numberGenerator.js     # Smart number generation algorithms
├── dataStorage.js        # JSON-based data persistence
├── purchaseInfo.js       # Courier service information
├── drawSchedule.js       # Draw schedules and next run recommendations
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
