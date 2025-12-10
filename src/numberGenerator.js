class NumberGenerator {
  constructor(analysis, lotteryType) {
    this.analysis = analysis;
    this.lotteryType = lotteryType;
    this.config = this.getLotteryConfig();
  }

  getLotteryConfig() {
    const configs = {
      powerball: {
        mainCount: 5,
        mainMax: 69,
        bonusMax: 26,
        bonusName: 'Powerball'
      },
      megamillions: {
        mainCount: 5,
        mainMax: 70,
        bonusMax: 25,
        bonusName: 'Mega Ball'
      },
      euromillions: {
        mainCount: 5,
        mainMax: 50,
        bonusMax: 12,
        bonusName: 'Lucky Star'
      }
    };

    return configs[this.lotteryType] || {
      mainCount: 6,
      mainMax: 50,
      bonusMax: null,
      bonusName: null
    };
  }

  weightedRandomSelection(numbers, weights, count) {
    const selected = new Set();
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);

    while (selected.size < count) {
      let random = Math.random() * totalWeight;
      let cumulative = 0;

      for (let i = 0; i < numbers.length; i++) {
        cumulative += weights[i];
        if (random <= cumulative && !selected.has(numbers[i])) {
          selected.add(numbers[i]);
          break;
        }
      }

      if (selected.size < count && selected.size < numbers.length) {
        const remaining = numbers.filter(n => !selected.has(n));
        if (remaining.length > 0) {
          selected.add(remaining[Math.floor(Math.random() * remaining.length)]);
        }
      }
    }

    return Array.from(selected).sort((a, b) => a - b);
  }

  generateBalancedNumbers() {
    const hotNumbers = this.analysis.mainNumbers.hot.slice(0, 10).map(h => h.number);
    const coldNumbers = this.analysis.mainNumbers.cold.slice(0, 10).map(c => c.number);
    const overdueNumbers = this.analysis.mainNumbers.overdue.slice(0, 10).map(o => o.number);

    const allCandidates = [...new Set([...hotNumbers, ...coldNumbers, ...overdueNumbers])];

    const weights = allCandidates.map(num => {
      let weight = 1;

      if (hotNumbers.includes(num)) weight += 3;
      if (overdueNumbers.includes(num)) weight += 2;
      if (coldNumbers.includes(num)) weight += 1;

      return weight;
    });

    return this.weightedRandomSelection(allCandidates, weights, this.config.mainCount);
  }

  generateHotBiasedNumbers() {
    const hotNumbers = this.analysis.mainNumbers.hot.slice(0, 15).map(h => h.number);
    const weights = hotNumbers.map((_, idx) => 15 - idx);

    return this.weightedRandomSelection(hotNumbers, weights, this.config.mainCount);
  }

  generateOverdueBiasedNumbers() {
    const overdueNumbers = this.analysis.mainNumbers.overdue.slice(0, 15).map(o => o.number);
    const weights = overdueNumbers.map((_, idx) => 15 - idx);

    return this.weightedRandomSelection(overdueNumbers, weights, this.config.mainCount);
  }

  generatePairBasedNumbers() {
    const commonPairs = this.analysis.patterns.commonPairs.slice(0, 5);
    const numbers = new Set();

    commonPairs.forEach(pairObj => {
      const [num1, num2] = pairObj.pair.split('-').map(Number);
      numbers.add(num1);
      numbers.add(num2);
    });

    const numbersArray = Array.from(numbers);

    if (numbersArray.length >= this.config.mainCount) {
      return numbersArray.slice(0, this.config.mainCount).sort((a, b) => a - b);
    } else {
      const hotNumbers = this.analysis.mainNumbers.hot.map(h => h.number);
      while (numbersArray.length < this.config.mainCount) {
        const candidate = hotNumbers.find(n => !numbersArray.includes(n));
        if (candidate) numbersArray.push(candidate);
        else break;
      }
      return numbersArray.sort((a, b) => a - b);
    }
  }

  ensureOddEvenBalance(numbers) {
    const oddCount = numbers.filter(n => n % 2 !== 0).length;
    const evenCount = numbers.length - oddCount;
    const targetOdd = Math.round(numbers.length / 2);

    return { oddCount, evenCount, targetOdd, balanced: Math.abs(oddCount - targetOdd) <= 1 };
  }

  ensureHighLowBalance(numbers) {
    const midpoint = Math.floor(this.config.mainMax / 2);
    const lowCount = numbers.filter(n => n <= midpoint).length;
    const highCount = numbers.length - lowCount;
    const targetLow = Math.round(numbers.length / 2);

    return { lowCount, highCount, targetLow, balanced: Math.abs(lowCount - targetLow) <= 1 };
  }

  generateBonusNumber() {
    if (!this.config.bonusMax || !this.analysis.bonusNumber) {
      return null;
    }

    const hotBonus = this.analysis.bonusNumber.hot.slice(0, 5).map(h => h.number);
    const overdueBonus = this.analysis.bonusNumber.overdue.slice(0, 5).map(o => o.number);

    const candidates = [...new Set([...hotBonus, ...overdueBonus])];
    const weights = candidates.map(num => {
      let weight = 1;
      if (hotBonus.includes(num)) weight += 2;
      if (overdueBonus.includes(num)) weight += 1;
      return weight;
    });

    return this.weightedRandomSelection(candidates, weights, 1)[0];
  }

  generateTopPicks(count = 3) {
    const picks = [];

    const balanced = this.generateBalancedNumbers();
    picks.push({
      strategy: 'Balanced Mix',
      description: 'Combines hot, cold, and overdue numbers with weighted selection',
      numbers: balanced,
      bonus: this.generateBonusNumber(),
      metrics: {
        oddEven: this.ensureOddEvenBalance(balanced),
        highLow: this.ensureHighLowBalance(balanced)
      }
    });

    if (count > 1) {
      const hotBiased = this.generateHotBiasedNumbers();
      picks.push({
        strategy: 'Hot Numbers Focus',
        description: 'Prioritizes the most frequently drawn numbers',
        numbers: hotBiased,
        bonus: this.generateBonusNumber(),
        metrics: {
          oddEven: this.ensureOddEvenBalance(hotBiased),
          highLow: this.ensureHighLowBalance(hotBiased)
        }
      });
    }

    if (count > 2) {
      const overdueBiased = this.generateOverdueBiasedNumbers();
      picks.push({
        strategy: 'Overdue Numbers',
        description: 'Focuses on numbers that haven\'t appeared recently',
        numbers: overdueBiased,
        bonus: this.generateBonusNumber(),
        metrics: {
          oddEven: this.ensureOddEvenBalance(overdueBiased),
          highLow: this.ensureHighLowBalance(overdueBiased)
        }
      });
    }

    return picks.slice(0, count);
  }

  formatPick(pick, index) {
    const bonusText = pick.bonus ? ` + ${this.config.bonusName}: ${pick.bonus}` : '';
    return `
Pick #${index + 1}: ${pick.strategy}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Numbers: ${pick.numbers.join(', ')}${bonusText}
Strategy: ${pick.description}

Balance Metrics:
  Odd/Even: ${pick.metrics.oddEven.oddCount} odd, ${pick.metrics.oddEven.evenCount} even ${pick.metrics.oddEven.balanced ? '✓' : '⚠'}
  High/Low: ${pick.metrics.highLow.highCount} high, ${pick.metrics.highLow.lowCount} low ${pick.metrics.highLow.balanced ? '✓' : '⚠'}
`;
  }
}

module.exports = NumberGenerator;
