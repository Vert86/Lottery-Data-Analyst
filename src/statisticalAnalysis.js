class StatisticalAnalysis {
  constructor(data) {
    this.data = data;
    this.draws = data.draws || [];
    this.lotteryType = data.lottery;
  }

  analyzeFrequency(numberSet = 'main') {
    const frequency = {};

    this.draws.forEach(draw => {
      const numbers = numberSet === 'main' ? draw.numbers : [draw.powerball || draw.megaball];

      if (numbers) {
        numbers.forEach(num => {
          frequency[num] = (frequency[num] || 0) + 1;
        });
      }
    });

    return frequency;
  }

  getHotNumbers(count = 10, numberSet = 'main') {
    const frequency = this.analyzeFrequency(numberSet);
    const sorted = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count);

    return sorted.map(([num, freq]) => ({
      number: parseInt(num),
      frequency: freq,
      percentage: ((freq / this.draws.length) * 100).toFixed(2)
    }));
  }

  getColdNumbers(count = 10, numberSet = 'main') {
    const frequency = this.analyzeFrequency(numberSet);
    const sorted = Object.entries(frequency)
      .sort((a, b) => a[1] - b[1])
      .slice(0, count);

    return sorted.map(([num, freq]) => ({
      number: parseInt(num),
      frequency: freq || 0,
      percentage: ((freq / this.draws.length) * 100).toFixed(2)
    }));
  }

  getOverdueNumbers(maxNumber = 69, numberSet = 'main') {
    const lastSeen = {};

    this.draws.forEach((draw, index) => {
      const numbers = numberSet === 'main' ? draw.numbers : [draw.powerball || draw.megaball];

      if (numbers) {
        numbers.forEach(num => {
          if (!lastSeen[num]) {
            lastSeen[num] = index;
          }
        });
      }
    });

    const overdue = [];
    for (let i = 1; i <= maxNumber; i++) {
      const lastSeenIndex = lastSeen[i] || this.draws.length;
      overdue.push({
        number: i,
        drawsSinceLastSeen: lastSeenIndex,
        lastSeenDate: lastSeenIndex < this.draws.length ? this.draws[lastSeenIndex].date : 'Never'
      });
    }

    return overdue.sort((a, b) => b.drawsSinceLastSeen - a.drawsSinceLastSeen).slice(0, 15);
  }

  analyzeOddEvenRatio() {
    const ratios = { odd: 0, even: 0 };

    this.draws.forEach(draw => {
      draw.numbers.forEach(num => {
        if (num % 2 === 0) ratios.even++;
        else ratios.odd++;
      });
    });

    const total = ratios.odd + ratios.even;
    return {
      odd: ratios.odd,
      even: ratios.even,
      oddPercentage: ((ratios.odd / total) * 100).toFixed(2),
      evenPercentage: ((ratios.even / total) * 100).toFixed(2)
    };
  }

  analyzeHighLowRatio(midpoint = 35) {
    const ratios = { low: 0, high: 0 };

    this.draws.forEach(draw => {
      draw.numbers.forEach(num => {
        if (num <= midpoint) ratios.low++;
        else ratios.high++;
      });
    });

    const total = ratios.low + ratios.high;
    return {
      low: ratios.low,
      high: ratios.high,
      lowPercentage: ((ratios.low / total) * 100).toFixed(2),
      highPercentage: ((ratios.high / total) * 100).toFixed(2),
      midpoint: midpoint
    };
  }

  findCommonPairs(minOccurrences = 3) {
    const pairs = {};

    this.draws.forEach(draw => {
      const numbers = draw.numbers.sort((a, b) => a - b);

      for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
          const pair = `${numbers[i]}-${numbers[j]}`;
          pairs[pair] = (pairs[pair] || 0) + 1;
        }
      }
    });

    return Object.entries(pairs)
      .filter(([_, count]) => count >= minOccurrences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([pair, count]) => ({
        pair: pair,
        occurrences: count,
        percentage: ((count / this.draws.length) * 100).toFixed(2)
      }));
  }

  findCommonTriplets(minOccurrences = 2) {
    const triplets = {};

    this.draws.forEach(draw => {
      const numbers = draw.numbers.sort((a, b) => a - b);

      for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
          for (let k = j + 1; k < numbers.length; k++) {
            const triplet = `${numbers[i]}-${numbers[j]}-${numbers[k]}`;
            triplets[triplet] = (triplets[triplet] || 0) + 1;
          }
        }
      }
    });

    return Object.entries(triplets)
      .filter(([_, count]) => count >= minOccurrences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([triplet, count]) => ({
        triplet: triplet,
        occurrences: count,
        percentage: ((count / this.draws.length) * 100).toFixed(2)
      }));
  }

  generateFullAnalysis() {
    const maxMainNumber = this.lotteryType === 'powerball' ? 69 :
                         this.lotteryType === 'megamillions' ? 70 : 50;
    const maxBonusNumber = this.lotteryType === 'powerball' ? 26 :
                          this.lotteryType === 'megamillions' ? 25 : null;

    const analysis = {
      lottery: this.lotteryType,
      totalDraws: this.draws.length,
      dateRange: {
        from: this.draws[this.draws.length - 1]?.date,
        to: this.draws[0]?.date
      },
      mainNumbers: {
        hot: this.getHotNumbers(15, 'main'),
        cold: this.getColdNumbers(15, 'main'),
        overdue: this.getOverdueNumbers(maxMainNumber, 'main')
      },
      patterns: {
        oddEven: this.analyzeOddEvenRatio(),
        highLow: this.analyzeHighLowRatio(Math.floor(maxMainNumber / 2)),
        commonPairs: this.findCommonPairs(),
        commonTriplets: this.findCommonTriplets()
      }
    };

    if (maxBonusNumber) {
      analysis.bonusNumber = {
        hot: this.getHotNumbers(10, 'bonus'),
        cold: this.getColdNumbers(10, 'bonus'),
        overdue: this.getOverdueNumbers(maxBonusNumber, 'bonus')
      };
    }

    return analysis;
  }
}

module.exports = StatisticalAnalysis;
