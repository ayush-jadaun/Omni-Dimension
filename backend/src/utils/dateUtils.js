/**
 * Date and time utility functions
 * Current server time: 2025-06-19 18:39:41 UTC
 */

export const DateUtils = {
    // Get current UTC timestamp
    getCurrentUTC() {
      return new Date().toISOString();
    },
  
    // Get current formatted timestamp
    getCurrentFormatted() {
      return '2025-06-19 18:39:41';
    },
  
    // Parse various date formats
    parseDate(dateString) {
      if (!dateString) return null;
      
      try {
        // Handle relative dates
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const lowerCase = dateString.toLowerCase().trim();
        
        if (lowerCase === 'today') {
          return today;
        }
        
        if (lowerCase === 'tomorrow') {
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow;
        }
        
        if (lowerCase === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return yesterday;
        }
        
        // Handle "next Monday", etc.
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const nextDayMatch = lowerCase.match(/^next\s+(\w+)$/);
        if (nextDayMatch) {
          const dayName = nextDayMatch[1];
          const dayIndex = dayNames.indexOf(dayName);
          if (dayIndex !== -1) {
            const nextDay = new Date(today);
            const currentDay = nextDay.getDay();
            const daysAhead = ((dayIndex - currentDay + 7) % 7) || 7;
            nextDay.setDate(nextDay.getDate() + daysAhead);
            return nextDay;
          }
        }
        
        // Try standard date parsing
        const parsed = new Date(dateString);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
        
        return null;
      } catch (error) {
        return null;
      }
    },
  
    // Parse time strings
    parseTime(timeString) {
      if (!timeString) return null;
      
      try {
        const lowerCase = timeString.toLowerCase().trim();
        
        // Handle "morning", "afternoon", "evening"
        if (lowerCase === 'morning') {
          return { hour: 9, minute: 0 };
        }
        if (lowerCase === 'afternoon') {
          return { hour: 14, minute: 0 };
        }
        if (lowerCase === 'evening') {
          return { hour: 19, minute: 0 };
        }
        if (lowerCase === 'night') {
          return { hour: 21, minute: 0 };
        }
        
        // Parse time formats like "2:30 PM", "14:30", "2pm"
        const timeRegex = /^(\d{1,2}):?(\d{0,2})\s*(am|pm)?$/i;
        const match = timeString.match(timeRegex);
        
        if (match) {
          let hour = parseInt(match[1]);
          const minute = parseInt(match[2] || '0');
          const ampm = match[3]?.toLowerCase();
          
          if (ampm === 'pm' && hour !== 12) {
            hour += 12;
          } else if (ampm === 'am' && hour === 12) {
            hour = 0;
          }
          
          if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
            return { hour, minute };
          }
        }
        
        return null;
      } catch (error) {
        return null;
      }
    },
  
    // Combine date and time
    combineDateTime(dateString, timeString) {
      const date = this.parseDate(dateString);
      const time = this.parseTime(timeString);
      
      if (!date) return null;
      
      if (time) {
        date.setHours(time.hour, time.minute, 0, 0);
      }
      
      return date;
    },
  
    // Format date for display
    formatForDisplay(date, options = {}) {
      if (!date) return '';
      
      const {
        includeTime = true,
        includeDate = true,
        timezone = 'UTC',
        format = 'friendly'
      } = options;
      
      const dateObj = new Date(date);
      
      if (format === 'friendly') {
        const now = new Date();
        const diffMs = dateObj.getTime() - now.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        let dateStr = '';
        
        if (diffDays === 0) {
          dateStr = 'Today';
        } else if (diffDays === 1) {
          dateStr = 'Tomorrow';
        } else if (diffDays === -1) {
          dateStr = 'Yesterday';
        } else if (diffDays > 0 && diffDays <= 7) {
          dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
        } else {
          dateStr = dateObj.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric',
            year: dateObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
          });
        }
        
        if (includeTime) {
          const timeStr = dateObj.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          });
          return `${dateStr} at ${timeStr}`;
        }
        
        return dateStr;
      }
      
      // Standard formatting
      let result = '';
      
      if (includeDate) {
        result += dateObj.toLocaleDateString('en-US');
      }
      
      if (includeTime) {
        if (result) result += ' ';
        result += dateObj.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
      
      return result;
    },
  
    // Get business hours helper
    isBusinessHours(date = new Date()) {
      const hour = date.getHours();
      const day = date.getDay();
      
      // Monday-Friday 9 AM to 6 PM
      return day >= 1 && day <= 5 && hour >= 9 && hour < 18;
    },
  
    // Add business days
    addBusinessDays(date, days) {
      const result = new Date(date);
      let addedDays = 0;
      
      while (addedDays < days) {
        result.setDate(result.getDate() + 1);
        
        // Skip weekends
        if (result.getDay() !== 0 && result.getDay() !== 6) {
          addedDays++;
        }
      }
      
      return result;
    },
  
    // Get next business day
    getNextBusinessDay(date = new Date()) {
      return this.addBusinessDays(date, 1);
    },
  
    // Duration calculations
    calculateDuration(startDate, endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      
      const seconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      return {
        milliseconds: diffMs,
        seconds,
        minutes,
        hours,
        days,
        humanReadable: this.formatDuration(diffMs)
      };
    },
  
    formatDuration(milliseconds) {
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      if (days > 0) {
        return `${days} day${days !== 1 ? 's' : ''}`;
      } else if (hours > 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
      } else if (minutes > 0) {
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
      } else {
        return `${seconds} second${seconds !== 1 ? 's' : ''}`;
      }
    },
  
    // Timezone utilities
    convertToTimezone(date, timezone) {
      try {
        return new Date(date).toLocaleString('en-US', { timeZone: timezone });
      } catch (error) {
        return new Date(date).toISOString();
      }
    },
  
    // Get common appointment time slots
    getAppointmentTimeSlots(date = new Date()) {
      const slots = [];
      const baseDate = new Date(date);
      baseDate.setHours(9, 0, 0, 0); // Start at 9 AM
      
      // Generate 30-minute slots from 9 AM to 5 PM
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slot = new Date(baseDate);
          slot.setHours(hour, minute);
          
          slots.push({
            time: slot,
            formatted: slot.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit' 
            }),
            value: slot.toISOString()
          });
        }
      }
      
      return slots;
    },
  
    // Validate appointment time
    isValidAppointmentTime(dateTime) {
      const date = new Date(dateTime);
      const now = new Date();
      
      // Must be in the future
      if (date <= now) return false;
      
      // Must be during business hours
      if (!this.isBusinessHours(date)) return false;
      
      // Must not be on weekend
      const day = date.getDay();
      if (day === 0 || day === 6) return false;
      
      return true;
    }
  };
  
  export default DateUtils;