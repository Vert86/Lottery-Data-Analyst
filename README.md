# Lottery Automation System

An intelligent lottery analysis and number generation system that uses historical data to identify patterns and generate optimized number combinations.

## Features

- **Data Acquisition**: Fetches historical lottery data from multiple sources
- **Statistical Analysis**: Analyzes frequency, hot/cold numbers, overdue numbers, and common pairs
- **Smart Generation**: Creates optimized number combinations based on statistical patterns
- **Remote Purchase Info**: Provides information on where to purchase tickets

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure API keys:
```bash
cp .env.example .env
# Edit .env and add your API key
```

3. Run the automation:
```bash
npm start
```

## Usage

- **Full automation (both lotteries)**: `npm start`
- **Single lottery**: `node src/index.js powerball` or `node src/index.js megamillions`
- **Fetch latest data**: `npm run fetch`
- **Analyze and generate numbers**: `npm run analyze`

## Data Sources

This system can work with:
- US Powerball
- US Mega Millions
- EuroMillions
- Other major lotteries via API providers (APIVerve, RapidAPI)

## Purchase Locations

Recommended lottery courier services:
- TheLotter.com (International)
- Lotto.com (US-focused)
- Jackpot.com (Multi-lottery)

## Disclaimer

This tool is for educational and entertainment purposes. Lottery drawings are random events, and past results do not guarantee future outcomes.
