class PurchaseInfo {
  static getCourierServices() {
    return [
      {
        name: 'TheLotter',
        url: 'https://www.thelotter.com',
        coverage: 'International (60+ lotteries)',
        features: [
          'Worldwide access to major lotteries',
          'Automatic ticket scanning',
          'Mobile app available',
          'Multi-draw subscriptions'
        ],
        lotteries: ['Powerball', 'Mega Millions', 'EuroMillions', 'EuroJackpot'],
        rating: 4.5,
        established: 2002
      }
    ];
  }

  static getRecommendation(lotteryType, location = 'US') {
    const services = this.getCourierServices();
    // TheLotter supports both US and International players
    const recommended = services.filter(s => s.coverage.includes('International'));

    return {
      lottery: lotteryType,
      location: location,
      recommended: recommended,
      allOptions: services
    };
  }

  static formatPurchaseInfo(lotteryType, location = 'US') {
    const services = this.getCourierServices();

    let output = '';

    if (lotteryType === 'all' || lotteryType === 'both') {
      const title = lotteryType === 'all' ?
        'RECOMMENDED SERVICES FOR ALL THREE LOTTERIES:' :
        'RECOMMENDED SERVICES FOR BOTH POWERBALL & MEGA MILLIONS:';

      output += title + '\n';
      output += '───────────────────────────────────────────────────────────\n\n';

      if (lotteryType === 'all') {
        output += '🌍 For EuroMillions (International Players):\n';
        output += '   TheLotter is HIGHLY RECOMMENDED for international access\n\n';
      }

      services.forEach((service, idx) => {
        output += `${idx + 1}. ${service.name} ⭐ ${service.rating}/5\n`;
        output += `   Website: ${service.url}\n`;
        output += `   Coverage: ${service.coverage}\n`;
        output += `   Established: ${service.established}\n\n`;
        output += `   Features:\n`;
        service.features.forEach(feature => {
          output += `   • ${feature}\n`;
        });
        output += '\n';
      });
    } else if (lotteryType === 'euromillions') {
      output += '\n';
      output += '═══════════════════════════════════════════════════════════\n';
      output += '           WHERE TO PURCHASE YOUR TICKETS\n';
      output += '═══════════════════════════════════════════════════════════\n\n';
      output += `Lottery: ${lotteryType.toUpperCase()}\n`;
      output += `Location: International\n\n`;

      output += 'HIGHLY RECOMMENDED SERVICE:\n';
      output += '───────────────────────────────────────────────────────────\n\n';

      const theLotter = services.find(s => s.name === 'TheLotter');
      if (theLotter) {
        output += `1. ${theLotter.name} ⭐ ${theLotter.rating}/5 (BEST FOR EUROMILLIONS)\n`;
        output += `   Website: ${theLotter.url}\n`;
        output += `   Coverage: ${theLotter.coverage}\n`;
        output += `   Established: ${theLotter.established}\n\n`;
        output += `   Features:\n`;
        theLotter.features.forEach(feature => {
          output += `   • ${feature}\n`;
        });
        output += '\n';
      }
    } else {
      const info = this.getRecommendation(lotteryType, location);

      output += '\n';
      output += '═══════════════════════════════════════════════════════════\n';
      output += '           WHERE TO PURCHASE YOUR TICKETS\n';
      output += '═══════════════════════════════════════════════════════════\n\n';
      output += `Lottery: ${lotteryType.toUpperCase()}\n`;
      output += `Location: ${location}\n\n`;

      output += 'RECOMMENDED SERVICES:\n';
      output += '───────────────────────────────────────────────────────────\n\n';

      info.recommended.forEach((service, idx) => {
        output += `${idx + 1}. ${service.name} ⭐ ${service.rating}/5\n`;
        output += `   Website: ${service.url}\n`;
        output += `   Coverage: ${service.coverage}\n`;
        output += `   Established: ${service.established}\n\n`;
        output += `   Features:\n`;
        service.features.forEach(feature => {
          output += `   • ${feature}\n`;
        });
        output += '\n';
      });
    }

    output += '───────────────────────────────────────────────────────────\n';
    output += 'IMPORTANT NOTES:\n';
    output += '• Always verify the service is licensed in your jurisdiction\n';
    output += '• Check service fees and commission rates\n';
    output += '• Enable two-factor authentication for account security\n';
    output += '• Services will scan and email you the actual ticket\n';
    output += '• Winnings are typically credited to your account\n';
    output += '• Large jackpots may require in-person claim\n';

    if (lotteryType !== 'both') {
      output += '═══════════════════════════════════════════════════════════\n\n';
    }

    return output;
  }

  static getDirectPurchaseInfo(lotteryType) {
    const officialSites = {
      powerball: {
        name: 'Powerball',
        official: 'https://www.powerball.com',
        states: 'Available in 45 US states + DC, Puerto Rico, US Virgin Islands',
        info: 'Must be 18+ (19+ in some states). Purchase from authorized retailers only.'
      },
      megamillions: {
        name: 'Mega Millions',
        official: 'https://www.megamillions.com',
        states: 'Available in 45 US states + DC, US Virgin Islands',
        info: 'Must be 18+ (19+ in some states). Find retailers at official website.'
      }
    };

    return officialSites[lotteryType] || null;
  }
}

module.exports = PurchaseInfo;
