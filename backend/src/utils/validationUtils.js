/**
 * Validation utility functions
 */

export const ValidationUtils = {
    // Email validation
    isValidEmail(email) {
      if (!email || typeof email !== 'string') return false;
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email.trim());
    },
  
    // Phone number validation
    isValidPhone(phone) {
      if (!phone || typeof phone !== 'string') return false;
      
      // Remove all non-digit characters
      const digits = phone.replace(/\D/g, '');
      
      // Must be 10-15 digits
      return digits.length >= 10 && digits.length <= 15;
    },
  
    // Password strength validation
    validatePassword(password) {
      if (!password || typeof password !== 'string') {
        return {
          isValid: false,
          score: 0,
          errors: ['Password is required']
        };
      }
  
      const errors = [];
      let score = 0;
  
      // Length check
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
      } else {
        score += 1;
      }
  
      // Uppercase check
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      } else {
        score += 1;
      }
  
      // Lowercase check
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      } else {
        score += 1;
      }
  
      // Number check
      if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
      } else {
        score += 1;
      }
  
      // Special character check
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
      } else {
        score += 1;
      }
  
      // Length bonus
      if (password.length >= 12) score += 1;
      if (password.length >= 16) score += 1;
  
      return {
        isValid: errors.length === 0,
        score: Math.min(score, 5), // Max score of 5
        strength: this.getPasswordStrength(score),
        errors
      };
    },
  
    getPasswordStrength(score) {
      if (score <= 2) return 'weak';
      if (score <= 3) return 'fair';
      if (score <= 4) return 'good';
      return 'strong';
    },
  
    // Username validation
    isValidUsername(username) {
      if (!username || typeof username !== 'string') return false;
      
      // Must be 3-30 characters, alphanumeric and underscores only
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      return usernameRegex.test(username);
    },
  
    // Name validation
    isValidName(name) {
      if (!name || typeof name !== 'string') return false;
      
      // Must be 1-50 characters, letters, spaces, hyphens, apostrophes
      const nameRegex = /^[a-zA-Z\s\-']{1,50}$/;
      return nameRegex.test(name.trim());
    },
  
    // URL validation
    isValidUrl(url) {
      if (!url || typeof url !== 'string') return false;
      
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    },
  
    // MongoDB ObjectId validation
    isValidObjectId(id) {
      if (!id || typeof id !== 'string') return false;
      
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      return objectIdRegex.test(id);
    },
  
    // UUID validation
    isValidUUID(uuid) {
      if (!uuid || typeof uuid !== 'string') return false;
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    },
  
    // Sanitize input
    sanitizeInput(input, options = {}) {
      if (typeof input !== 'string') return input;
      
      let sanitized = input.trim();
      
      if (options.lowercase) {
        sanitized = sanitized.toLowerCase();
      }
      
      if (options.removeSpaces) {
        sanitized = sanitized.replace(/\s+/g, '');
      }
      
      if (options.alphanumericOnly) {
        sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, '');
      }
      
      if (options.maxLength) {
        sanitized = sanitized.substring(0, options.maxLength);
      }
      
      return sanitized;
    },
  
    // Validate business hours
    validateBusinessHours(hours) {
      if (!hours || typeof hours !== 'object') return false;
      
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      
      for (const day of days) {
        if (hours[day]) {
          const dayHours = hours[day];
          if (!dayHours.open || !dayHours.close) return false;
          
          // Validate time format (HH:MM)
          const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(dayHours.open) || !timeRegex.test(dayHours.close)) {
            return false;
          }
        }
      }
      
      return true;
    },
  
    // Validate coordinates
    validateCoordinates(lat, lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      
      return !isNaN(latitude) && !isNaN(longitude) &&
             latitude >= -90 && latitude <= 90 &&
             longitude >= -180 && longitude <= 180;
    },
  
    // Validate date range
    validateDateRange(startDate, endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { isValid: false, error: 'Invalid date format' };
      }
      
      if (start >= end) {
        return { isValid: false, error: 'Start date must be before end date' };
      }
      
      return { isValid: true };
    },
  
    // Validate pagination parameters
    validatePagination(page, limit) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      
      if (isNaN(pageNum) || pageNum < 1) {
        return { isValid: false, error: 'Page must be a positive integer' };
      }
      
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        return { isValid: false, error: 'Limit must be between 1 and 100' };
      }
      
      return { 
        isValid: true, 
        page: pageNum, 
        limit: limitNum 
      };
    },
  
    // Validate sort parameters
    validateSort(sortBy, allowedFields = []) {
      if (!sortBy) return { isValid: true, sortBy: 'createdAt' };
      
      if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
        return { 
          isValid: false, 
          error: `Sort field must be one of: ${allowedFields.join(', ')}` 
        };
      }
      
      return { isValid: true, sortBy };
    },
  
    // Validate file upload
    validateFileUpload(file, options = {}) {
      const {
        maxSize = 5 * 1024 * 1024, // 5MB default
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
        maxFiles = 1
      } = options;
  
      const errors = [];
  
      if (!file) {
        errors.push('File is required');
        return { isValid: false, errors };
      }
  
      // Check file size
      if (file.size > maxSize) {
        errors.push(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
      }
  
      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
      }
  
      return {
        isValid: errors.length === 0,
        errors
      };
    },
  
    // Validate JSON
    validateJSON(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        return { isValid: true, data: parsed };
      } catch (error) {
        return { isValid: false, error: error.message };
      }
    },
  
    // Validate timezone
    validateTimezone(timezone) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
        return true;
      } catch {
        return false;
      }
    },
  
    // Custom validation rule engine
    validateWithRules(data, rules) {
      const errors = {};
      
      for (const [field, fieldRules] of Object.entries(rules)) {
        const value = data[field];
        const fieldErrors = [];
        
        for (const rule of fieldRules) {
          const result = this.applyValidationRule(value, rule);
          if (!result.isValid) {
            fieldErrors.push(result.error);
          }
        }
        
        if (fieldErrors.length > 0) {
          errors[field] = fieldErrors;
        }
      }
      
      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    },
  
    applyValidationRule(value, rule) {
      switch (rule.type) {
        case 'required':
          return {
            isValid: value !== undefined && value !== null && value !== '',
            error: rule.message || 'This field is required'
          };
        
        case 'email':
          return {
            isValid: this.isValidEmail(value),
            error: rule.message || 'Invalid email format'
          };
        
        case 'minLength':
          return {
            isValid: !value || value.length >= rule.value,
            error: rule.message || `Minimum length is ${rule.value} characters`
          };
        
        case 'maxLength':
          return {
            isValid: !value || value.length <= rule.value,
            error: rule.message || `Maximum length is ${rule.value} characters`
          };
        
        case 'pattern':
          return {
            isValid: !value || rule.value.test(value),
            error: rule.message || 'Invalid format'
          };
        
        default:
          return { isValid: true };
      }
    }
  };
  
  export default ValidationUtils;