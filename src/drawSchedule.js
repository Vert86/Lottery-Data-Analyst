class DrawSchedule {
  constructor() {
    // All times in UTC for consistency
    this.schedules = {
      powerball: {
        name: 'Powerball',
        drawDays: [1, 3, 6], // Monday, Wednesday, Saturday (0=Sunday, 6=Saturday)
        drawTimeUTC: '02:59', // 10:59 PM ET = 02:59 UTC next day
        apiDelayHours: 2, // Data available ~2 hours after draw
        timezone: 'America/New_York'
      },
      megamillions: {
        name: 'Mega Millions',
        drawDays: [2, 5], // Tuesday, Friday
        drawTimeUTC: '03:00', // 11:00 PM ET = 03:00 UTC next day
        apiDelayHours: 2,
        timezone: 'America/New_York'
      },
      euromillions: {
        name: 'EuroMillions',
        drawDays: [2, 5], // Tuesday, Friday
        drawTimeUTC: '20:30', // 8:30 PM GMT = 20:30 UTC
        apiDelayHours: 1, // Usually available within an hour
        timezone: 'Europe/London'
      }
    };
  }

  /**
   * Get user's local time zone
   */
  getUserTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Convert UTC time to user's local time
   */
  formatTimeInUserTZ(utcHour, utcMinute, userTimezone) {
    const now = new Date();
    const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour, utcMinute));

    return utcDate.toLocaleTimeString('en-US', {
      timeZone: userTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Get day name from day number
   */
  getDayName(dayNum) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  }

  /**
   * Calculate when fresh data will be available for a lottery
   */
  getNextDataAvailability(lotteryType) {
    const schedule = this.schedules[lotteryType];
    if (!schedule) return null;

    const now = new Date();
    const currentDay = now.getUTCDay();
    const currentTime = now.getUTCHours() * 60 + now.getUTCMinutes();

    const [drawHour, drawMinute] = schedule.drawTimeUTC.split(':').map(Number);
    const drawTime = drawHour * 60 + drawMinute;
    const dataAvailableTime = drawTime + (schedule.apiDelayHours * 60);

    let nextDrawDay = null;
    let daysUntil = 0;

    // Find next draw day
    for (let i = 0; i <= 7; i++) {
      const checkDay = (currentDay + i) % 7;
      const isDrawDay = schedule.drawDays.includes(checkDay);

      if (i === 0 && isDrawDay && currentTime < dataAvailableTime) {
        // Today is draw day and data not yet available
        nextDrawDay = checkDay;
        daysUntil = 0;
        break;
      } else if (i > 0 && isDrawDay) {
        // Future draw day
        nextDrawDay = checkDay;
        daysUntil = i;
        break;
      }
    }

    if (nextDrawDay === null) return null;

    // Calculate exact next data availability time
    const nextDate = new Date(now);
    nextDate.setUTCDate(now.getUTCDate() + daysUntil);
    nextDate.setUTCHours(Math.floor(dataAvailableTime / 60));
    nextDate.setUTCMinutes(dataAvailableTime % 60);
    nextDate.setUTCSeconds(0);

    return {
      lotteryType,
      nextDrawDay: this.getDayName(nextDrawDay),
      nextDrawDate: nextDate,
      daysUntil,
      hoursUntil: Math.round((nextDate - now) / (1000 * 60 * 60))
    };
  }

  /**
   * Check if data is stale and needs refresh
   */
  isDataStale(lastFetchedAt, lotteryType) {
    if (!lastFetchedAt) return true;

    const lastFetch = new Date(lastFetchedAt);
    const nextAvailability = this.getNextDataAvailability(lotteryType);

    if (!nextAvailability) return false;

    // If next draw has already happened since last fetch, data is stale
    const now = new Date();
    const timeSinceLastFetch = now - lastFetch;
    const hoursUntilNext = nextAvailability.hoursUntil;

    // If we're past a draw day and haven't fetched, data is stale
    if (timeSinceLastFetch > 96 * 60 * 60 * 1000) { // 4 days
      return true;
    }

    return false;
  }

  /**
   * Get recommended next run time with user-friendly message
   */
  getRecommendedRunTime(lastFetchedAt, lotteryType, userTimezone = null) {
    if (!userTimezone) {
      userTimezone = this.getUserTimezone();
    }

    const schedule = this.schedules[lotteryType];
    if (!schedule) return null;

    const nextAvailability = this.getNextDataAvailability(lotteryType);
    if (!nextAvailability) return null;

    const isStale = this.isDataStale(lastFetchedAt, lotteryType);
    const nextDate = nextAvailability.nextDrawDate;

    const localTime = nextDate.toLocaleString('en-US', {
      timeZone: userTimezone,
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const drawDaysLocal = schedule.drawDays.map(day => this.getDayName(day));

    return {
      lotteryName: schedule.name,
      isDataStale: isStale,
      lastFetchedAt: lastFetchedAt ? new Date(lastFetchedAt).toLocaleString('en-US', { timeZone: userTimezone }) : 'Never',
      nextRunTime: localTime,
      hoursUntilNext: nextAvailability.hoursUntil,
      drawDays: drawDaysLocal.join(', '),
      userTimezone: userTimezone,
      message: this.generateRecommendationMessage(nextAvailability, isStale, userTimezone)
    };
  }

  /**
   * Generate user-friendly recommendation message
   */
  generateRecommendationMessage(nextAvailability, isStale, userTimezone) {
    const { hoursUntil, nextDrawDay } = nextAvailability;
    const nextDate = nextAvailability.nextDrawDate;

    const localTime = nextDate.toLocaleTimeString('en-US', {
      timeZone: userTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    if (isStale) {
      return `⚠️  Data is stale! Fresh data available now. Run the automation to get latest results.`;
    }

    if (hoursUntil < 1) {
      return `🔄 Fresh data available in less than 1 hour! Check back soon.`;
    } else if (hoursUntil < 24) {
      return `📅 Next fresh data available in ~${hoursUntil} hours (${nextDrawDay} at ${localTime})`;
    } else {
      const days = Math.floor(hoursUntil / 24);
      return `📅 Next fresh data in ~${days} day${days > 1 ? 's' : ''} (${nextDrawDay} at ${localTime})`;
    }
  }

  /**
   * Format draw schedule summary
   */
  formatScheduleSummary(userTimezone = null) {
    if (!userTimezone) {
      userTimezone = this.getUserTimezone();
    }

    let output = '\n';
    output += '╔════════════════════════════════════════════════════════╗\n';
    output += '║              LOTTERY DRAW SCHEDULES                    ║\n';
    output += `║              Your Timezone: ${userTimezone.padEnd(28)} ║\n`;
    output += '╚════════════════════════════════════════════════════════╝\n\n';

    Object.keys(this.schedules).forEach(lotteryType => {
      const schedule = this.schedules[lotteryType];
      const [utcHour, utcMinute] = schedule.drawTimeUTC.split(':').map(Number);
      const localDrawTime = this.formatTimeInUserTZ(utcHour, utcMinute, userTimezone);
      const drawDays = schedule.drawDays.map(d => this.getDayName(d)).join(', ');

      output += `${schedule.name.toUpperCase()}\n`;
      output += `${'─'.repeat(60)}\n`;
      output += `Draw Days: ${drawDays}\n`;
      output += `Draw Time: ~${localDrawTime} (your local time)\n`;
      output += `Data Available: ~${schedule.apiDelayHours} hour${schedule.apiDelayHours > 1 ? 's' : ''} after draw\n\n`;
    });

    return output;
  }

  /**
   * Get optimal weekly schedule for all lotteries
   */
  getOptimalWeeklySchedule(userTimezone = null) {
    if (!userTimezone) {
      userTimezone = this.getUserTimezone();
    }

    return {
      timezone: userTimezone,
      recommendation: 'Run automation twice weekly to catch all lottery draws',
      optimalDays: [
        {
          day: 'Wednesday',
          reason: 'Captures Monday Powerball + Tuesday Mega Millions & EuroMillions',
          lotteries: ['Powerball (Mon)', 'Mega Millions (Tue)', 'EuroMillions (Tue)']
        },
        {
          day: 'Saturday',
          reason: 'Captures Wednesday Powerball + Friday Mega Millions & EuroMillions',
          lotteries: ['Powerball (Wed)', 'Mega Millions (Fri)', 'EuroMillions (Fri)']
        }
      ]
    };
  }
}

module.exports = DrawSchedule;
