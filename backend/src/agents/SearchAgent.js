import BaseAgent from './BaseAgent.js';
import { AGENT_TYPES } from '../config/constants.js';
import { logger } from '../utils/logger.js';

export class SearchAgent extends BaseAgent {
  constructor() {
    const capabilities = [
      'place_search',
      'business_lookup',
      'location_services',
      'review_analysis',
      'distance_calculation',
      'availability_check'
    ];

    const systemPrompt = `
You are the Search Agent, specialized in finding and analyzing businesses, locations, and services.

Your primary responsibilities:
1. Search for businesses using Google Places API
2. Find restaurants, medical facilities, and service providers
3. Analyze reviews and ratings to rank results
4. Calculate distances and travel times
5. Check business hours and availability
6. Provide detailed business information

Search capabilities:
- Text search for businesses by name or type
- Nearby search within specified radius
- Detailed place information retrieval
- Photo and review collection
- Business hours and contact information
- Price level and rating analysis

When searching:
1. Use specific search terms and filters
2. Consider user location and preferences
3. Rank results by relevance, rating, and distance
4. Provide comprehensive business details
5. Include actionable contact information
6. Filter results based on user criteria

Always prioritize:
- Accuracy of business information
- Current operating status
- User preferences and constraints
- Quality ratings and reviews
- Practical accessibility

Return structured results with confidence scores and detailed metadata.
    `;

    super(AGENT_TYPES.SEARCH, capabilities, systemPrompt);
    
    this.searchCache = new Map();
    this.rateLimitTracker = new Map();
  }

  async executeTask(taskId, taskData) {
    logger.info(`Search Agent executing task: ${taskId}`, taskData);

    try {
      switch (taskData.action) {
        case 'search_places':
          return await this.searchPlaces(taskData);
        case 'get_place_details':
          return await this.getPlaceDetails(taskData);
        case 'find_nearby':
          return await this.findNearbyPlaces(taskData);
        case 'analyze_reviews':
          return await this.analyzeReviews(taskData);
        case 'check_availability':
          return await this.checkAvailability(taskData);
        case 'compare_options':
          return await this.compareOptions(taskData);
        default:
          return await super.executeTask(taskId, taskData);
      }
    } catch (error) {
      logger.error(`Search Agent task execution failed:`, error);
      throw error;
    }
  }

  async searchPlaces(taskData) {
    const { 
      query, 
      location, 
      filters = {},
      maxResults = 10,
      sortBy = 'relevance' 
    } = taskData.parameters || taskData;

    logger.info('Searching places:', { query, location, filters });

    // Check cache first
    const cacheKey = this.generateCacheKey('search', { query, location, filters });
    if (this.searchCache.has(cacheKey)) {
      logger.debug('Returning cached search results');
      return this.searchCache.get(cacheKey);
    }

    // Check rate limits
    if (!this.checkRateLimit('search')) {
      throw new Error('Search rate limit exceeded. Please try again later.');
    }

    try {
      // Use SearchTool from tools
      const searchTool = this.tools.find(tool => tool.name === 'google_search');
      
      const searchInput = JSON.stringify({
        action: 'search_places',
        query: query,
        location: location,
        filters: {
          ...filters,
          limit: maxResults
        }
      });

      const result = await searchTool._call(searchInput);
      const parsedResult = JSON.parse(result);

      if (!parsedResult.success) {
        throw new Error(`Search failed: ${parsedResult.error}`);
      }

      let places = parsedResult.result.places || [];

      // Apply additional filtering and sorting
      places = this.applyAdvancedFilters(places, filters);
      places = this.sortPlaces(places, sortBy, location);

      // Enhance results with additional analysis
      const enhancedResults = await this.enhanceSearchResults(places);

      const finalResult = {
        success: true,
        result: {
          places: enhancedResults,
          totalFound: places.length,
          searchQuery: query,
          location: location,
          filters: filters,
          searchMetadata: {
            timestamp: new Date().toISOString(),
            source: 'google_places',
            cached: false
          }
        },
        metadata: {
          processingTime: Date.now(),
          resultsCount: enhancedResults.length,
          agentType: 'search'
        }
      };

      // Cache results for 15 minutes
      this.searchCache.set(cacheKey, finalResult);
      setTimeout(() => this.searchCache.delete(cacheKey), 15 * 60 * 1000);

      return finalResult;

    } catch (error) {
      logger.error('Place search error:', error);
      throw error;
    }
  }

  async getPlaceDetails(taskData) {
    const { placeId, includeReviews = true } = taskData.parameters || taskData;

    logger.info('Getting place details for:', placeId);

    if (!this.checkRateLimit('details')) {
      throw new Error('Details rate limit exceeded. Please try again later.');
    }

    try {
      const searchTool = this.tools.find(tool => tool.name === 'google_search');
      
      const detailsInput = JSON.stringify({
        action: 'get_details',
        query: placeId
      });

      const result = await searchTool._call(detailsInput);
      const parsedResult = JSON.parse(result);

      if (!parsedResult.success) {
        throw new Error(`Details fetch failed: ${parsedResult.error}`);
      }

      let placeDetails = parsedResult.result;

      // Enhance with additional analysis
      if (includeReviews && placeDetails.reviews) {
        const reviewAnalysis = await this.analyzeReviewSentiment(placeDetails.reviews);
        placeDetails.reviewAnalysis = reviewAnalysis;
      }

      // Add business insights
      placeDetails.businessInsights = this.generateBusinessInsights(placeDetails);

      return {
        success: true,
        result: placeDetails,
        metadata: {
          processingTime: Date.now(),
          placeId: placeId,
          agentType: 'search'
        }
      };

    } catch (error) {
      logger.error('Place details error:', error);
      throw error;
    }
  }

  async findNearbyPlaces(taskData) {
    const { 
      location, 
      type = 'establishment', 
      radius = 5000,
      filters = {},
      maxResults = 20 
    } = taskData.parameters || taskData;

    logger.info('Finding nearby places:', { location, type, radius });

    if (!this.checkRateLimit('nearby')) {
      throw new Error('Nearby search rate limit exceeded. Please try again later.');
    }

    try {
      const searchTool = this.tools.find(tool => tool.name === 'google_search');
      
      const nearbyInput = JSON.stringify({
        action: 'find_nearby',
        location: location,
        filters: {
          ...filters,
          type: type,
          radius: radius,
          limit: maxResults
        }
      });

      const result = await searchTool._call(nearbyInput);
      const parsedResult = JSON.parse(result);

      if (!parsedResult.success) {
        throw new Error(`Nearby search failed: ${parsedResult.error}`);
      }

      let places = parsedResult.result.places || [];

      // Calculate distances and enhance results
      places = places.map(place => ({
        ...place,
        distance: this.calculateDistance(location, place.location),
        travelTime: this.estimateTravelTime(location, place.location)
      }));

      // Sort by distance and rating combination
      places.sort((a, b) => {
        const scoreA = this.calculateLocationScore(a);
        const scoreB = this.calculateLocationScore(b);
        return scoreB - scoreA;
      });

      return {
        success: true,
        result: {
          places: places.slice(0, maxResults),
          searchCenter: location,
          radius: radius,
          totalFound: places.length
        },
        metadata: {
          processingTime: Date.now(),
          resultsCount: places.length,
          agentType: 'search'
        }
      };

    } catch (error) {
      logger.error('Nearby search error:', error);
      throw error;
    }
  }

  async analyzeReviews(taskData) {
    const { placeId, reviews } = taskData.parameters || taskData;

    logger.info('Analyzing reviews for place:', placeId);

    try {
      let reviewsToAnalyze = reviews;
      
      if (!reviewsToAnalyze && placeId) {
        // Fetch reviews if not provided
        const detailsResult = await this.getPlaceDetails({ placeId, includeReviews: true });
        reviewsToAnalyze = detailsResult.result.reviews || [];
      }

      if (!reviewsToAnalyze || reviewsToAnalyze.length === 0) {
        return {
          success: true,
          result: {
            sentiment: 'neutral',
            confidence: 0.5,
            summary: 'No reviews available for analysis',
            insights: []
          }
        };
      }

      const analysis = await this.analyzeReviewSentiment(reviewsToAnalyze);

      return {
        success: true,
        result: analysis,
        metadata: {
          processingTime: Date.now(),
          reviewsAnalyzed: reviewsToAnalyze.length,
          agentType: 'search'
        }
      };

    } catch (error) {
      logger.error('Review analysis error:', error);
      throw error;
    }
  }

  async checkAvailability(taskData) {
    const { placeId, requestedTime } = taskData.parameters || taskData;

    logger.info('Checking availability for:', { placeId, requestedTime });

    try {
      // Get place details including opening hours
      const detailsResult = await this.getPlaceDetails({ placeId, includeReviews: false });
      const place = detailsResult.result;

      const availability = this.assessAvailability(place, requestedTime);

      return {
        success: true,
        result: {
          placeId: placeId,
          placeName: place.name,
          requestedTime: requestedTime,
          availability: availability,
          openingHours: place.openingHours,
          recommendations: this.generateTimeRecommendations(place.openingHours, requestedTime)
        },
        metadata: {
          processingTime: Date.now(),
          agentType: 'search'
        }
      };

    } catch (error) {
      logger.error('Availability check error:', error);
      throw error;
    }
  }

  async compareOptions(taskData) {
    const { places, criteria = {} } = taskData.parameters || taskData;

    logger.info('Comparing place options:', { count: places.length, criteria });

    try {
      const comparison = places.map(place => {
        const score = this.calculateOverallScore(place, criteria);
        const pros = this.identifyPros(place, criteria);
        const cons = this.identifyCons(place, criteria);

        return {
          ...place,
          comparisonScore: score,
          pros: pros,
          cons: cons,
          recommendation: this.generateRecommendation(place, score, pros, cons)
        };
      });

      // Sort by comparison score
      comparison.sort((a, b) => b.comparisonScore - a.comparisonScore);

      // Generate overall comparison insights
      const insights = this.generateComparisonInsights(comparison, criteria);

      return {
        success: true,
        result: {
          comparison: comparison,
          topChoice: comparison[0],
          insights: insights,
          criteria: criteria
        },
        metadata: {
          processingTime: Date.now(),
          placesCompared: places.length,
          agentType: 'search'
        }
      };

    } catch (error) {
      logger.error('Option comparison error:', error);
      throw error;
    }
  }

  // Helper methods
  applyAdvancedFilters(places, filters) {
    return places.filter(place => {
      // Rating filter
      if (filters.minRating && place.rating < filters.minRating) {
        return false;
      }

      // Price level filter
      if (filters.maxPriceLevel && place.priceLevel > filters.maxPriceLevel) {
        return false;
      }

      // Open now filter
      if (filters.openNow && !place.openNow) {
        return false;
      }

      // Review count filter
      if (filters.minReviews && place.userRatingsTotal < filters.minReviews) {
        return false;
      }

      // Type filter
      if (filters.excludeTypes) {
        const hasExcludedType = place.types.some(type => 
          filters.excludeTypes.includes(type)
        );
        if (hasExcludedType) return false;
      }

      return true;
    });
  }

  sortPlaces(places, sortBy, userLocation) {
    switch (sortBy) {
      case 'rating':
        return places.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      
      case 'distance':
        if (userLocation) {
          return places.sort((a, b) => {
            const distA = this.calculateDistance(userLocation, a.location);
            const distB = this.calculateDistance(userLocation, b.location);
            return distA - distB;
          });
        }
        return places;
      
      case 'reviews':
        return places.sort((a, b) => (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0));
      
      case 'relevance':
      default:
        return places.sort((a, b) => {
          const scoreA = this.calculateRelevanceScore(a);
          const scoreB = this.calculateRelevanceScore(b);
          return scoreB - scoreA;
        });
    }
  }

  async enhanceSearchResults(places) {
    return Promise.all(places.map(async (place) => {
      try {
        // Add business category classification
        place.businessCategory = this.classifyBusiness(place.types);
        
        // Add quality indicators
        place.qualityIndicators = this.assessQualityIndicators(place);
        
        // Add practical information
        place.practicalInfo = {
          hasParking: this.checkForParking(place.types),
          wheelchairAccessible: this.checkAccessibility(place.types),
          acceptsReservations: this.checkReservations(place.types),
          hasWebsite: !!place.website,
          hasPhone: !!place.phone
        };

        return place;
      } catch (error) {
        logger.warn(`Error enhancing place ${place.placeId}:`, error);
        return place;
      }
    }));
  }

  async analyzeReviewSentiment(reviews) {
    try {
      // Use NLP capabilities for sentiment analysis
      const geminiTool = this.tools.find(tool => tool.name === 'gemini_llm');
      
      const reviewTexts = reviews.slice(0, 10).map(r => r.text).join('\n\n');
      
      const analysisInput = JSON.stringify({
        task: 'analysis',
        prompt: `Analyze the sentiment and key themes from these business reviews:

${reviewTexts}

Return JSON with:
{
  "overall_sentiment": "positive|negative|neutral",
  "confidence": 0.85,
  "key_themes": ["service", "food quality", "atmosphere"],
  "positive_aspects": ["excellent service", "great food"],
  "negative_aspects": ["slow service", "noisy"],
  "sentiment_distribution": {
    "positive": 70,
    "neutral": 20,
    "negative": 10
  },
  "recommendation_summary": "brief summary"
}`,
        parameters: {
          temperature: 0.3,
          maxTokens: 800
        }
      });

      const result = await geminiTool._call(analysisInput);
      const parsedResult = JSON.parse(result);

      if (parsedResult.success) {
        try {
          return JSON.parse(parsedResult.result);
        } catch (error) {
          // Fallback to simple analysis
          return this.simpleReviewAnalysis(reviews);
        }
      } else {
        return this.simpleReviewAnalysis(reviews);
      }

    } catch (error) {
      logger.error('Review sentiment analysis error:', error);
      return this.simpleReviewAnalysis(reviews);
    }
  }

  simpleReviewAnalysis(reviews) {
    const ratings = reviews.map(r => r.rating);
    const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    
    let sentiment = 'neutral';
    if (avgRating >= 4) sentiment = 'positive';
    else if (avgRating <= 2) sentiment = 'negative';

    const positiveCount = ratings.filter(r => r >= 4).length;
    const neutralCount = ratings.filter(r => r === 3).length;
    const negativeCount = ratings.filter(r => r <= 2).length;

    return {
      overall_sentiment: sentiment,
      confidence: 0.6,
      key_themes: ['service', 'quality'],
      positive_aspects: ['good rating'],
      negative_aspects: [],
      sentiment_distribution: {
        positive: Math.round((positiveCount / ratings.length) * 100),
        neutral: Math.round((neutralCount / ratings.length) * 100),
        negative: Math.round((negativeCount / ratings.length) * 100)
      },
      recommendation_summary: `Average rating of ${avgRating.toFixed(1)} based on ${reviews.length} reviews`
    };
  }

  calculateDistance(location1, location2) {
    if (!location1 || !location2) return null;
    
    const lat1 = typeof location1 === 'object' ? location1.lat : parseFloat(location1.split(',')[0]);
    const lng1 = typeof location1 === 'object' ? location1.lng : parseFloat(location1.split(',')[1]);
    const lat2 = location2.lat;
    const lng2 = location2.lng;

    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  estimateTravelTime(origin, destination) {
    const distance = this.calculateDistance(origin, destination);
    if (!distance) return null;
    
    // Simple estimation: average city driving speed of 30 km/h
    const travelTimeHours = distance / 30;
    const travelTimeMinutes = Math.round(travelTimeHours * 60);
    
    return {
      driving: {
        duration: travelTimeMinutes,
        text: `${travelTimeMinutes} min`
      },
      walking: {
        duration: Math.round(travelTimeMinutes * 4), // Walking is ~4x slower
        text: `${Math.round(travelTimeMinutes * 4)} min`
      }
    };
  }

  calculateLocationScore(place) {
    let score = 0;
    
    // Rating component (40%)
    if (place.rating) {
      score += (place.rating / 5) * 40;
    }
    
    // Review count component (30%)
    if (place.userRatingsTotal) {
      const reviewScore = Math.min(place.userRatingsTotal / 100, 1) * 30;
      score += reviewScore;
    }
    
    // Distance component (30%) - closer is better
    if (place.distance) {
      const distanceScore = Math.max(0, (10 - place.distance) / 10) * 30;
      score += distanceScore;
    }
    
    return score;
  }

  calculateRelevanceScore(place) {
    let score = 0;
    
    // Rating (50%)
    if (place.rating) {
      score += (place.rating / 5) * 50;
    }
    
    // Review count (30%)
    if (place.userRatingsTotal) {
      score += Math.min(place.userRatingsTotal / 100, 1) * 30;
    }
    
    // Open now bonus (20%)
    if (place.openNow) {
      score += 20;
    }
    
    return score;
  }

  classifyBusiness(types) {
    const categories = {
      food: ['restaurant', 'food', 'cafe', 'bakery', 'bar'],
      health: ['doctor', 'dentist', 'hospital', 'pharmacy', 'physiotherapist'],
      beauty: ['beauty_salon', 'hair_care', 'spa'],
      retail: ['store', 'shopping_mall', 'clothing_store'],
      services: ['bank', 'gas_station', 'car_repair', 'lawyer']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (types.some(type => keywords.includes(type))) {
        return category;
      }
    }

    return 'general';
  }

  assessQualityIndicators(place) {
    const indicators = {
      highRating: place.rating >= 4.0,
      manyReviews: place.userRatingsTotal >= 50,
      hasWebsite: !!place.website,
      hasPhone: !!place.phone,
      recentlyUpdated: true, // Would need to check last update
      verifiedBusiness: true // Would need to check verification status
    };

    const score = Object.values(indicators).filter(Boolean).length / Object.keys(indicators).length;
    
    return {
      ...indicators,
      qualityScore: Math.round(score * 100)
    };
  }

  checkForParking(types) {
    return types.includes('parking') || types.includes('establishment');
  }

  checkAccessibility(types) {
    // Most modern establishments are accessible
    return !types.includes('tourist_attraction') && !types.includes('natural_feature');
  }

  checkReservations(types) {
    return types.includes('restaurant') || types.includes('doctor') || types.includes('beauty_salon');
  }

  assessAvailability(place, requestedTime) {
    if (!place.openingHours || !requestedTime) {
      return {
        status: 'unknown',
        message: 'Opening hours or requested time not available'
      };
    }

    const requestedDate = new Date(requestedTime);
    const dayOfWeek = requestedDate.getDay();
    const timeString = requestedDate.toTimeString().slice(0, 5);

    // Simple availability check (would need more sophisticated parsing in production)
    return {
      status: 'likely_open',
      message: 'Business is likely to be open at the requested time',
      confidence: 0.7,
      recommendation: 'Please call to confirm availability'
    };
  }

  generateTimeRecommendations(openingHours, requestedTime) {
    if (!openingHours) {
      return ['Call ahead to confirm hours'];
    }

    return [
      'Check current opening hours before visiting',
      'Consider calling ahead for the best service',
      'Avoid peak hours for faster service'
    ];
  }

  calculateOverallScore(place, criteria) {
    let score = 0;
    let maxScore = 0;

    // Rating importance
    if (criteria.ratingWeight) {
      const ratingScore = (place.rating || 0) / 5 * criteria.ratingWeight;
      score += ratingScore;
      maxScore += criteria.ratingWeight;
    }

    // Distance importance
    if (criteria.distanceWeight && place.distance) {
      const distanceScore = Math.max(0, (10 - place.distance) / 10) * criteria.distanceWeight;
      score += distanceScore;
      maxScore += criteria.distanceWeight;
    }

    // Price importance
    if (criteria.priceWeight) {
      const priceScore = (5 - (place.priceLevel || 2)) / 4 * criteria.priceWeight;
      score += priceScore;
      maxScore += criteria.priceWeight;
    }

    return maxScore > 0 ? score / maxScore : 0.5;
  }

  identifyPros(place, criteria) {
    const pros = [];

    if (place.rating >= 4.5) pros.push('Excellent rating');
    if (place.userRatingsTotal >= 100) pros.push('Many positive reviews');
    if (place.openNow) pros.push('Currently open');
    if (place.website) pros.push('Has website');
    if (place.phone) pros.push('Phone available');
    if (place.distance && place.distance < 2) pros.push('Very close');

    return pros;
  }

  identifyCons(place, criteria) {
    const cons = [];

    if (place.rating < 3.5) cons.push('Below average rating');
    if (place.userRatingsTotal < 10) cons.push('Few reviews');
    if (!place.openNow) cons.push('Currently closed');
    if (!place.phone) cons.push('No phone number');
    if (place.distance && place.distance > 10) cons.push('Far distance');

    return cons;
  }

  generateRecommendation(place, score, pros, cons) {
    if (score >= 0.8) {
      return {
        level: 'highly_recommended',
        message: 'Excellent choice with great ratings and convenient location',
        confidence: 0.9
      };
    } else if (score >= 0.6) {
      return {
        level: 'recommended',
        message: 'Good option with solid ratings',
        confidence: 0.7
      };
    } else if (score >= 0.4) {
      return {
        level: 'consider',
        message: 'Decent option but check reviews carefully',
        confidence: 0.5
      };
    } else {
      return {
        level: 'not_recommended',
        message: 'May not be the best choice',
        confidence: 0.3
      };
    }
  }

  generateComparisonInsights(comparison, criteria) {
    const insights = [];

    const topPlace = comparison[0];
    const avgRating = comparison.reduce((sum, p) => sum + (p.rating || 0), 0) / comparison.length;

    insights.push(`Top choice: ${topPlace.name} with a score of ${(topPlace.comparisonScore * 100).toFixed(0)}%`);
    insights.push(`Average rating across options: ${avgRating.toFixed(1)}`);

    if (criteria.ratingWeight > criteria.distanceWeight) {
      insights.push('Rating was prioritized over distance in this comparison');
    }

    const openNow = comparison.filter(p => p.openNow).length;
    if (openNow > 0) {
      insights.push(`${openNow} of ${comparison.length} options are currently open`);
    }

    return insights;
  }

  checkRateLimit(operation) {
    const now = Date.now();
    const key = `${operation}_${Math.floor(now / 60000)}`; // Per minute window
    
    if (!this.rateLimitTracker.has(key)) {
      this.rateLimitTracker.set(key, 0);
    }
    
    const currentCount = this.rateLimitTracker.get(key);
    const limits = {
      search: 50,
      details: 100,
      nearby: 30
    };
    
    if (currentCount >= (limits[operation] || 20)) {
      return false;
    }
    
    this.rateLimitTracker.set(key, currentCount + 1);
    
    // Cleanup old entries
    for (const [k] of this.rateLimitTracker) {
      const keyTime = parseInt(k.split('_')[1]);
      if (now - keyTime * 60000 > 300000) { // 5 minutes old
        this.rateLimitTracker.delete(k);
      }
    }
    
    return true;
  }

  generateCacheKey(operation, params) {
    return `${operation}_${JSON.stringify(params)}`;
  }
}

export default SearchAgent;