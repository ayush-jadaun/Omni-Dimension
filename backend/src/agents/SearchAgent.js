/**
 * SearchAgent using Free APIs (OpenStreetMap, Overpass, Nominatim)
 * Current Date and Time: 2025-06-20 15:13:00 UTC
 * Current User: ayush20244048
 */

import BaseAgent from "./BaseAgent.js";
import { AGENT_TYPES } from "../config/constants.js";
import { logger } from "../utils/logger.js";

export class SearchAgent extends BaseAgent {
  constructor() {
    const capabilities = [
      "place_search",
      "business_lookup",
      "location_services",
      "review_analysis",
      "distance_calculation",
      "availability_check",
    ];

    const systemPrompt = `
You are the Search Agent, specialized in finding and analyzing businesses, locations, and services using free and open-source data.

Your primary responsibilities:
1. Search for businesses using OpenStreetMap and Overpass API
2. Find restaurants, medical facilities, and service providers
3. Analyze available data to rank results
4. Calculate distances and travel times
5. Check business hours and availability when data is available
6. Provide detailed business information from open sources

Search capabilities:
- Text search for businesses by name or type using OpenStreetMap
- Nearby search within specified radius using Overpass API
- Detailed place information retrieval from OSM data
- Business hours and contact information when available
- Basic rating estimation and analysis
- Mock data generation for development/testing

When searching:
1. Use specific search terms and filters
2. Consider user location and preferences
3. Rank results by relevance, estimated rating, and distance
4. Provide comprehensive business details from available data
5. Include actionable contact information when available
6. Filter results based on user criteria
7. Supplement with mock data when needed for testing

Always prioritize:
- Accuracy of available business information
- Current operating status when determinable
- User preferences and constraints
- Open data quality and completeness
- Practical accessibility and usability

Return structured results with confidence scores and detailed metadata.
Current Date: 2025-06-20 15:13:00
Current User: ayush20244048
    `;

    super(AGENT_TYPES.SEARCH, capabilities, systemPrompt);

    this.searchCache = new Map();
    this.rateLimitTracker = new Map();

    logger.info(
      "✅ SearchAgent initialized with free APIs at 2025-06-20 15:13:00",
      {
        currentUser: "ayush20244048",
        apis: ["OpenStreetMap", "Overpass", "Nominatim"],
      }
    );
  }

  async executeTask(taskId, taskData) {
    logger.info(
      `🔍 Search Agent executing task: ${taskId} at 2025-06-20 15:13:00`,
      {
        action: taskData.action,
        currentUser: "ayush20244048",
      }
    );

    try {
      switch (taskData.action) {
        case "search_places":
          return await this.searchPlaces(taskData);
        case "get_place_details":
          return await this.getPlaceDetails(taskData);
        case "find_nearby":
          return await this.findNearbyPlaces(taskData);
        case "analyze_reviews":
          return await this.analyzeReviews(taskData);
        case "check_availability":
          return await this.checkAvailability(taskData);
        case "compare_options":
          return await this.compareOptions(taskData);
        default:
          return await super.executeTask(taskId, taskData);
      }
    } catch (error) {
      logger.error(
        `❌ Search Agent task execution failed at 2025-06-20 15:13:00:`,
        {
          error: error.message,
          taskId,
          action: taskData.action,
          currentUser: "ayush20244048",
        }
      );
      throw error;
    }
  }

  async searchPlaces(taskData) {
    const {
      query,
      location,
      filters = {},
      maxResults = 10,
      sortBy = "relevance",
    } = taskData.parameters || taskData;

    logger.info("🗺️ Searching places with free APIs at 2025-06-20 15:13:00:", {
      query,
      location,
      filters,
      currentUser: "ayush20244048",
    });

    // Check cache first
    const cacheKey = this.generateCacheKey("search", {
      query,
      location,
      filters,
    });
    if (this.searchCache.has(cacheKey)) {
      logger.debug("✅ Returning cached search results at 2025-06-20 15:13:00");
      return this.searchCache.get(cacheKey);
    }

    // Check rate limits
    if (!this.checkRateLimit("search")) {
      logger.warn("⚠️ Search rate limit exceeded at 2025-06-20 15:13:00");
      throw new Error("Search rate limit exceeded. Please try again later.");
    }

    try {
      // Use free SearchTool
      const searchTool = this.tools.find(
        (tool) => tool.name === "google_search"
      );

      if (!searchTool) {
        logger.warn(
          "⚠️ SearchTool not found, using fallback mock data at 2025-06-20 15:13:00"
        );
        return this.getMockSearchResults(query, location, filters);
      }

      const searchInput = JSON.stringify({
        action: "search_places",
        query: query,
        location: location,
        filters: {
          ...filters,
          limit: maxResults,
        },
      });

      const result = await searchTool._call(searchInput);
      const parsedResult = JSON.parse(result);

      if (!parsedResult.success) {
        logger.warn(
          "⚠️ Search tool failed, using mock data at 2025-06-20 15:13:00:",
          {
            error: parsedResult.error,
            currentUser: "ayush20244048",
          }
        );
        return this.getMockSearchResults(query, location, filters);
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
            timestamp: "2025-06-20 15:13:00",
            source: parsedResult.result.source || "openstreetmap",
            cached: false,
            currentUser: "ayush20244048",
          },
        },
        metadata: {
          processingTime: Date.now(),
          resultsCount: enhancedResults.length,
          agentType: "search",
          timestamp: "2025-06-20 15:13:00",
          currentUser: "ayush20244048",
        },
      };

      // Cache results for 15 minutes
      this.searchCache.set(cacheKey, finalResult);
      setTimeout(() => this.searchCache.delete(cacheKey), 15 * 60 * 1000);

      logger.info("✅ Search completed successfully at 2025-06-20 15:13:00:", {
        totalFound: finalResult.result.totalFound,
        returned: finalResult.result.places.length,
        source: finalResult.result.searchMetadata.source,
        currentUser: "ayush20244048",
      });

      return finalResult;
    } catch (error) {
      logger.error("❌ Place search error at 2025-06-20 15:13:00:", {
        error: error.message,
        query,
        location,
        currentUser: "ayush20244048",
      });

      // Fallback to mock data for reliability
      logger.info("🧪 Using mock data fallback at 2025-06-20 15:13:00");
      return this.getMockSearchResults(query, location, filters);
    }
  }

  /**
   * Generate mock search results for development and fallback
   */
  getMockSearchResults(query, location, filters) {
    logger.info("🧪 Generating mock search results at 2025-06-20 15:13:00:", {
      query,
      location,
      currentUser: "ayush20244048",
    });

    const mockPlaces = [
      {
        placeId: "mock_1",
        name: `${query} Place #1`,
        address: `123 Main St, ${location || "New York"}, NY 10001`,
        rating: 4.5,
        userRatingsTotal: 150,
        priceLevel: 2,
        types: this.getTypesFromQuery(query),
        location: { lat: 40.7128, lng: -74.006 },
        openNow: true,
        phone: "+1 (555) 123-4567",
        website: "https://example.com/place1",
        source: "mock_data",
        distance: 0.5,
        businessCategory: this.classifyBusiness(this.getTypesFromQuery(query)),
        qualityIndicators: {
          highRating: true,
          manyReviews: true,
          hasWebsite: true,
          hasPhone: true,
          qualityScore: 85,
        },
      },
      {
        placeId: "mock_2",
        name: `${query} Place #2`,
        address: `456 Oak Ave, ${location || "New York"}, NY 10002`,
        rating: 4.2,
        userRatingsTotal: 89,
        priceLevel: 3,
        types: this.getTypesFromQuery(query),
        location: { lat: 40.7589, lng: -73.9851 },
        openNow: false,
        phone: "+1 (555) 234-5678",
        website: null,
        source: "mock_data",
        distance: 1.2,
        businessCategory: this.classifyBusiness(this.getTypesFromQuery(query)),
        qualityIndicators: {
          highRating: true,
          manyReviews: true,
          hasWebsite: false,
          hasPhone: true,
          qualityScore: 75,
        },
      },
      {
        placeId: "mock_3",
        name: `Best ${query} in ${location || "the Area"}`,
        address: `789 Pine St, ${location || "New York"}, NY 10003`,
        rating: 4.8,
        userRatingsTotal: 203,
        priceLevel: 1,
        types: this.getTypesFromQuery(query),
        location: { lat: 40.7282, lng: -73.7949 },
        openNow: true,
        phone: "+1 (555) 345-6789",
        website: "https://example.com/best-place",
        source: "mock_data",
        distance: 2.1,
        businessCategory: this.classifyBusiness(this.getTypesFromQuery(query)),
        qualityIndicators: {
          highRating: true,
          manyReviews: true,
          hasWebsite: true,
          hasPhone: true,
          qualityScore: 95,
        },
      },
    ];

    // Apply filters
    const filteredPlaces = this.applyAdvancedFilters(mockPlaces, filters);
    const sortedPlaces = this.sortPlaces(
      filteredPlaces,
      filters.sortBy || "relevance",
      location
    );

    return {
      success: true,
      result: {
        places: sortedPlaces.slice(0, filters.limit || 10),
        totalFound: filteredPlaces.length,
        searchQuery: query,
        location: location || "",
        filters: filters,
        searchMetadata: {
          timestamp: "2025-06-20 15:13:00",
          source: "mock_data",
          cached: false,
          currentUser: "ayush20244048",
        },
      },
      metadata: {
        processingTime: Date.now(),
        resultsCount: sortedPlaces.length,
        agentType: "search",
        timestamp: "2025-06-20 15:13:00",
        currentUser: "ayush20244048",
      },
    };
  }

  /**
   * Get appropriate types based on search query
   */
  getTypesFromQuery(query) {
    const queryLower = query.toLowerCase();

    if (queryLower.includes("restaurant") || queryLower.includes("food")) {
      return ["restaurant", "food", "establishment"];
    }
    if (queryLower.includes("doctor") || queryLower.includes("medical")) {
      return ["doctor", "health", "medical"];
    }
    if (queryLower.includes("dentist")) {
      return ["dentist", "health", "medical"];
    }
    if (queryLower.includes("cafe") || queryLower.includes("coffee")) {
      return ["cafe", "food", "establishment"];
    }
    if (queryLower.includes("pharmacy")) {
      return ["pharmacy", "health", "medical"];
    }
    if (queryLower.includes("bank")) {
      return ["bank", "finance", "establishment"];
    }

    return ["establishment", "business"];
  }

  async getPlaceDetails(taskData) {
    const { placeId, includeReviews = true } = taskData.parameters || taskData;

    logger.info("📍 Getting place details at 2025-06-20 15:13:00:", {
      placeId,
      includeReviews,
      currentUser: "ayush20244048",
    });

    if (!this.checkRateLimit("details")) {
      throw new Error("Details rate limit exceeded. Please try again later.");
    }

    try {
      const searchTool = this.tools.find(
        (tool) => tool.name === "google_search"
      );

      if (!searchTool) {
        return this.getMockPlaceDetails(placeId, includeReviews);
      }

      const detailsInput = JSON.stringify({
        action: "get_details",
        query: placeId,
      });

      const result = await searchTool._call(detailsInput);
      const parsedResult = JSON.parse(result);

      if (!parsedResult.success) {
        logger.warn(
          "⚠️ Place details failed, using mock data at 2025-06-20 15:13:00:",
          {
            error: parsedResult.error,
            placeId,
            currentUser: "ayush20244048",
          }
        );
        return this.getMockPlaceDetails(placeId, includeReviews);
      }

      let placeDetails = parsedResult.result;

      // Enhance with additional analysis
      if (includeReviews && placeDetails.reviews) {
        const reviewAnalysis = await this.analyzeReviewSentiment(
          placeDetails.reviews
        );
        placeDetails.reviewAnalysis = reviewAnalysis;
      }

      // Add business insights
      placeDetails.businessInsights =
        this.generateBusinessInsights(placeDetails);

      return {
        success: true,
        result: placeDetails,
        metadata: {
          processingTime: Date.now(),
          placeId: placeId,
          agentType: "search",
          timestamp: "2025-06-20 15:13:00",
          currentUser: "ayush20244048",
        },
      };
    } catch (error) {
      logger.error("❌ Place details error at 2025-06-20 15:13:00:", {
        error: error.message,
        placeId,
        currentUser: "ayush20244048",
      });

      return this.getMockPlaceDetails(placeId, includeReviews);
    }
  }

  /**
   * Generate mock place details
   */
  getMockPlaceDetails(placeId, includeReviews) {
    logger.info("🧪 Generating mock place details at 2025-06-20 15:13:00:", {
      placeId,
      includeReviews,
      currentUser: "ayush20244048",
    });

    const mockDetails = {
      placeId,
      name: "Sample Restaurant & Cafe",
      address: "123 Main St, New York, NY 10001",
      phone: "+1 (555) 123-4567",
      website: "https://example.com/sample-restaurant",
      rating: 4.5,
      userRatingsTotal: 150,
      priceLevel: 2,
      openingHours: {
        open_now: true,
        weekday_text: [
          "Monday: 9:00 AM – 10:00 PM",
          "Tuesday: 9:00 AM – 10:00 PM",
          "Wednesday: 9:00 AM – 10:00 PM",
          "Thursday: 9:00 AM – 10:00 PM",
          "Friday: 9:00 AM – 11:00 PM",
          "Saturday: 9:00 AM – 11:00 PM",
          "Sunday: 10:00 AM – 9:00 PM",
        ],
      },
      reviews: includeReviews
        ? [
            {
              author: "John D.",
              rating: 5,
              text: "Excellent food and outstanding service! The atmosphere is cozy and welcoming. Highly recommend the pasta dishes.",
              time: Date.now() - 86400000, // 1 day ago
              profilePhoto: null,
            },
            {
              author: "Sarah M.",
              rating: 4,
              text: "Good atmosphere and tasty food. The staff was friendly and attentive. Will definitely come back.",
              time: Date.now() - 172800000, // 2 days ago
            },
            {
              author: "Mike R.",
              rating: 5,
              text: "Amazing place! Great coffee and the breakfast menu is fantastic. Perfect spot for a morning meeting.",
              time: Date.now() - 259200000, // 3 days ago
            },
            {
              author: "Lisa K.",
              rating: 4,
              text: "Nice location with good food quality. The prices are reasonable and the service is quick.",
              time: Date.now() - 345600000, // 4 days ago
            },
          ]
        : [],
      photos: [],
      types: ["restaurant", "food", "establishment"],
      source: "mock_data",
      businessInsights: {
        busyTimes: {
          peak: ["12:00-14:00", "19:00-21:00"],
          quiet: ["15:00-17:00", "21:30-22:00"],
        },
        popularItems: ["Pasta", "Coffee", "Breakfast"],
        averageVisitDuration: "45 minutes",
        accessibility: "Wheelchair accessible",
        parking: "Street parking available",
      },
    };

    // Add review analysis if reviews are included
    if (includeReviews && mockDetails.reviews.length > 0) {
      mockDetails.reviewAnalysis = this.simpleReviewAnalysis(
        mockDetails.reviews
      );
    }

    return {
      success: true,
      result: mockDetails,
      metadata: {
        processingTime: Date.now(),
        placeId: placeId,
        agentType: "search",
        source: "mock_data",
        timestamp: "2025-06-20 15:13:00",
        currentUser: "ayush20244048",
      },
    };
  }

  async findNearbyPlaces(taskData) {
    const {
      location,
      type = "establishment",
      radius = 5000,
      filters = {},
      maxResults = 20,
    } = taskData.parameters || taskData;

    logger.info("📍 Finding nearby places at 2025-06-20 15:13:00:", {
      location,
      type,
      radius,
      maxResults,
      currentUser: "ayush20244048",
    });

    if (!this.checkRateLimit("nearby")) {
      throw new Error(
        "Nearby search rate limit exceeded. Please try again later."
      );
    }

    try {
      const searchTool = this.tools.find(
        (tool) => tool.name === "google_search"
      );

      if (!searchTool) {
        return this.getMockNearbyResults(
          location,
          type,
          radius,
          filters,
          maxResults
        );
      }

      const nearbyInput = JSON.stringify({
        action: "find_nearby",
        location: location,
        filters: {
          ...filters,
          type: type,
          radius: radius,
          limit: maxResults,
        },
      });

      const result = await searchTool._call(nearbyInput);
      const parsedResult = JSON.parse(result);

      if (!parsedResult.success) {
        logger.warn(
          "⚠️ Nearby search failed, using mock data at 2025-06-20 15:13:00:",
          {
            error: parsedResult.error,
            currentUser: "ayush20244048",
          }
        );
        return this.getMockNearbyResults(
          location,
          type,
          radius,
          filters,
          maxResults
        );
      }

      let places = parsedResult.result.places || [];

      // Calculate distances and enhance results
      places = places.map((place) => ({
        ...place,
        distance: this.calculateDistance(location, place.location),
        travelTime: this.estimateTravelTime(location, place.location),
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
          searchCenter: parsedResult.result.center || location,
          radius: radius,
          totalFound: places.length,
        },
        metadata: {
          processingTime: Date.now(),
          resultsCount: places.length,
          agentType: "search",
          timestamp: "2025-06-20 15:13:00",
          currentUser: "ayush20244048",
        },
      };
    } catch (error) {
      logger.error("❌ Nearby search error at 2025-06-20 15:13:00:", {
        error: error.message,
        location,
        type,
        currentUser: "ayush20244048",
      });

      return this.getMockNearbyResults(
        location,
        type,
        radius,
        filters,
        maxResults
      );
    }
  }

  /**
   * Generate mock nearby results
   */
  getMockNearbyResults(location, type, radius, filters, maxResults) {
    logger.info("🧪 Generating mock nearby results at 2025-06-20 15:13:00:", {
      location,
      type,
      radius,
      currentUser: "ayush20244048",
    });

    // Generate nearby places around a center point
    const centerCoords =
      typeof location === "object" ? location : { lat: 40.7128, lng: -74.006 };

    const mockPlaces = [];
    for (let i = 1; i <= Math.min(maxResults, 15); i++) {
      // Generate random coordinates within radius
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * (radius / 1000); // Convert to km

      const lat = centerCoords.lat + (distance / 111) * Math.cos(angle);
      const lng =
        centerCoords.lng +
        (distance / (111 * Math.cos((centerCoords.lat * Math.PI) / 180))) *
          Math.sin(angle);

      mockPlaces.push({
        placeId: `nearby_mock_${i}`,
        name: `${type} Place #${i}`,
        vicinity: `${100 + i} Street Name, Local Area`,
        rating: 3.5 + Math.random() * 1.5, // Random rating between 3.5-5.0
        userRatingsTotal: Math.floor(Math.random() * 200) + 10,
        priceLevel: Math.floor(Math.random() * 4) + 1,
        types: [type, "establishment"],
        location: { lat, lng },
        openNow: Math.random() > 0.3, // 70% chance of being open
        distance: distance,
        travelTime: this.estimateTravelTime(centerCoords, { lat, lng }),
        source: "mock_data",
      });
    }

    // Apply filters and sort
    const filteredPlaces = this.applyAdvancedFilters(mockPlaces, filters);
    const sortedPlaces = filteredPlaces.sort((a, b) => a.distance - b.distance);

    return {
      success: true,
      result: {
        places: sortedPlaces.slice(0, maxResults),
        searchCenter: centerCoords,
        radius: radius,
        totalFound: filteredPlaces.length,
      },
      metadata: {
        processingTime: Date.now(),
        resultsCount: sortedPlaces.length,
        agentType: "search",
        source: "mock_data",
        timestamp: "2025-06-20 15:13:00",
        currentUser: "ayush20244048",
      },
    };
  }

  async analyzeReviews(taskData) {
    const { placeId, reviews } = taskData.parameters || taskData;

    logger.info("📊 Analyzing reviews at 2025-06-20 15:13:00:", {
      placeId,
      hasReviews: !!reviews,
      reviewCount: reviews?.length || 0,
      currentUser: "ayush20244048",
    });

    try {
      let reviewsToAnalyze = reviews;

      if (!reviewsToAnalyze && placeId) {
        // Fetch reviews if not provided
        const detailsResult = await this.getPlaceDetails({
          placeId,
          includeReviews: true,
        });
        reviewsToAnalyze = detailsResult.result.reviews || [];
      }

      if (!reviewsToAnalyze || reviewsToAnalyze.length === 0) {
        return {
          success: true,
          result: {
            sentiment: "neutral",
            confidence: 0.5,
            summary: "No reviews available for analysis",
            insights: [],
            timestamp: "2025-06-20 15:13:00",
            currentUser: "ayush20244048",
          },
        };
      }

      const analysis = await this.analyzeReviewSentiment(reviewsToAnalyze);

      return {
        success: true,
        result: {
          ...analysis,
          timestamp: "2025-06-20 15:13:00",
          currentUser: "ayush20244048",
        },
        metadata: {
          processingTime: Date.now(),
          reviewsAnalyzed: reviewsToAnalyze.length,
          agentType: "search",
          timestamp: "2025-06-20 15:13:00",
          currentUser: "ayush20244048",
        },
      };
    } catch (error) {
      logger.error("❌ Review analysis error at 2025-06-20 15:13:00:", {
        error: error.message,
        placeId,
        currentUser: "ayush20244048",
      });
      throw error;
    }
  }

  async checkAvailability(taskData) {
    const { placeId, requestedTime } = taskData.parameters || taskData;

    logger.info("🕐 Checking availability at 2025-06-20 15:13:00:", {
      placeId,
      requestedTime,
      currentUser: "ayush20244048",
    });

    try {
      // Get place details including opening hours
      const detailsResult = await this.getPlaceDetails({
        placeId,
        includeReviews: false,
      });
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
          recommendations: this.generateTimeRecommendations(
            place.openingHours,
            requestedTime
          ),
          timestamp: "2025-06-20 15:13:00",
          currentUser: "ayush20244048",
        },
        metadata: {
          processingTime: Date.now(),
          agentType: "search",
          timestamp: "2025-06-20 15:13:00",
          currentUser: "ayush20244048",
        },
      };
    } catch (error) {
      logger.error("❌ Availability check error at 2025-06-20 15:13:00:", {
        error: error.message,
        placeId,
        currentUser: "ayush20244048",
      });
      throw error;
    }
  }

  async compareOptions(taskData) {
    const { places, criteria = {} } = taskData.parameters || taskData;

    logger.info("⚖️ Comparing place options at 2025-06-20 15:13:00:", {
      count: places.length,
      criteria,
      currentUser: "ayush20244048",
    });

    try {
      const comparison = places.map((place) => {
        const score = this.calculateOverallScore(place, criteria);
        const pros = this.identifyPros(place, criteria);
        const cons = this.identifyCons(place, criteria);

        return {
          ...place,
          comparisonScore: score,
          pros: pros,
          cons: cons,
          recommendation: this.generateRecommendation(place, score, pros, cons),
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
          criteria: criteria,
          timestamp: "2025-06-20 15:13:00",
          currentUser: "ayush20244048",
        },
        metadata: {
          processingTime: Date.now(),
          placesCompared: places.length,
          agentType: "search",
          timestamp: "2025-06-20 15:13:00",
          currentUser: "ayush20244048",
        },
      };
    } catch (error) {
      logger.error("❌ Option comparison error at 2025-06-20 15:13:00:", {
        error: error.message,
        placesCount: places.length,
        currentUser: "ayush20244048",
      });
      throw error;
    }
  }

  // Helper methods
  applyAdvancedFilters(places, filters) {
    return places.filter((place) => {
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
        const hasExcludedType = place.types.some((type) =>
          filters.excludeTypes.includes(type)
        );
        if (hasExcludedType) return false;
      }

      return true;
    });
  }

  sortPlaces(places, sortBy, userLocation) {
    switch (sortBy) {
      case "rating":
        return places.sort((a, b) => (b.rating || 0) - (a.rating || 0));

      case "distance":
        if (userLocation) {
          return places.sort((a, b) => {
            const distA = this.calculateDistance(userLocation, a.location);
            const distB = this.calculateDistance(userLocation, b.location);
            return distA - distB;
          });
        }
        return places;

      case "reviews":
        return places.sort(
          (a, b) => (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0)
        );

      case "relevance":
      default:
        return places.sort((a, b) => {
          const scoreA = this.calculateRelevanceScore(a);
          const scoreB = this.calculateRelevanceScore(b);
          return scoreB - scoreA;
        });
    }
  }

  async enhanceSearchResults(places) {
    return Promise.all(
      places.map(async (place) => {
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
            hasPhone: !!place.phone,
          };

          return place;
        } catch (error) {
          logger.warn(
            `⚠️ Error enhancing place ${place.placeId} at 2025-06-20 15:13:00:`,
            {
              error: error.message,
              currentUser: "ayush20244048",
            }
          );
          return place;
        }
      })
    );
  }

  async analyzeReviewSentiment(reviews) {
    try {
      // Try to use NLP capabilities for sentiment analysis
      const geminiTool = this.tools.find((tool) => tool.name === "gemini_llm");

      if (geminiTool && reviews.length > 0) {
        const reviewTexts = reviews
          .slice(0, 10)
          .map((r) => r.text)
          .join("\n\n");

        const analysisInput = JSON.stringify({
          task: "analysis",
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
            maxTokens: 800,
          },
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
        }
      }

      // Fallback to simple analysis
      return this.simpleReviewAnalysis(reviews);
    } catch (error) {
      logger.error(
        "❌ Review sentiment analysis error at 2025-06-20 15:13:00:",
        {
          error: error.message,
          currentUser: "ayush20244048",
        }
      );
      return this.simpleReviewAnalysis(reviews);
    }
  }

  simpleReviewAnalysis(reviews) {
    if (!reviews || reviews.length === 0) {
      return {
        overall_sentiment: "neutral",
        confidence: 0.5,
        key_themes: [],
        positive_aspects: [],
        negative_aspects: [],
        sentiment_distribution: {
          positive: 0,
          neutral: 100,
          negative: 0,
        },
        recommendation_summary: "No reviews available for analysis",
      };
    }

    const ratings = reviews.map((r) => r.rating);
    const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    let sentiment = "neutral";
    if (avgRating >= 4) sentiment = "positive";
    else if (avgRating <= 2) sentiment = "negative";

    const positiveCount = ratings.filter((r) => r >= 4).length;
    const neutralCount = ratings.filter((r) => r === 3).length;
    const negativeCount = ratings.filter((r) => r <= 2).length;

    // Extract basic themes from review text
    const allText = reviews
      .map((r) => r.text || "")
      .join(" ")
      .toLowerCase();
    const themes = [];
    if (allText.includes("service")) themes.push("service");
    if (allText.includes("food") || allText.includes("meal"))
      themes.push("food quality");
    if (allText.includes("atmosphere") || allText.includes("ambiance"))
      themes.push("atmosphere");
    if (allText.includes("price") || allText.includes("cost"))
      themes.push("pricing");
    if (allText.includes("staff")) themes.push("staff");

    return {
      overall_sentiment: sentiment,
      confidence: 0.6,
      key_themes: themes.length > 0 ? themes : ["service", "quality"],
      positive_aspects:
        avgRating >= 4 ? ["good rating", "positive reviews"] : [],
      negative_aspects: avgRating <= 2 ? ["low rating"] : [],
      sentiment_distribution: {
        positive: Math.round((positiveCount / ratings.length) * 100),
        neutral: Math.round((neutralCount / ratings.length) * 100),
        negative: Math.round((negativeCount / ratings.length) * 100),
      },
      recommendation_summary: `Average rating of ${avgRating.toFixed(
        1
      )} based on ${reviews.length} reviews`,
    };
  }

  /**
   * Generate business insights
   */
  generateBusinessInsights(place) {
    const insights = {
      category: this.classifyBusiness(place.types || []),
      qualityScore: this.assessQualityIndicators(place).qualityScore,
      isPopular: (place.userRatingsTotal || 0) > 100,
      isHighlyRated: (place.rating || 0) >= 4.0,
      hasOnlinePresence: !!(place.website || place.phone),
      estimatedPriceRange: this.getPriceRangeText(place.priceLevel),
      accessibility: {
        hasPhone: !!place.phone,
        hasWebsite: !!place.website,
        likelyAccessible: this.checkAccessibility(place.types || []),
      },
    };

    return insights;
  }

  /**
   * Get price range text
   */
  getPriceRangeText(priceLevel) {
    switch (priceLevel) {
      case 1:
        return "Inexpensive ($)";
      case 2:
        return "Moderate ($$)";
      case 3:
        return "Expensive ($$$)";
      case 4:
        return "Very Expensive ($$$$)";
      default:
        return "Price not available";
    }
  }

  calculateDistance(location1, location2) {
    if (!location1 || !location2) return null;

    const lat1 =
      typeof location1 === "object"
        ? location1.lat
        : parseFloat(location1.split(",")[0]);
    const lng1 =
      typeof location1 === "object"
        ? location1.lng
        : parseFloat(location1.split(",")[1]);
    const lat2 = location2.lat;
    const lng2 = location2.lng;

    const R = 6371; // Radius of Earth in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

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
        text: `${travelTimeMinutes} min`,
      },
      walking: {
        duration: Math.round(travelTimeMinutes * 4), // Walking is ~4x slower
        text: `${Math.round(travelTimeMinutes * 4)} min`,
      },
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
      food: ["restaurant", "food", "cafe", "bakery", "bar"],
      health: ["doctor", "dentist", "hospital", "pharmacy", "physiotherapist"],
      beauty: ["beauty_salon", "hair_care", "spa"],
      retail: ["store", "shopping_mall", "clothing_store"],
      services: ["bank", "gas_station", "car_repair", "lawyer"],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (types.some((type) => keywords.includes(type))) {
        return category;
      }
    }

    return "general";
  }

  assessQualityIndicators(place) {
    const indicators = {
      highRating: (place.rating || 0) >= 4.0,
      manyReviews: (place.userRatingsTotal || 0) >= 50,
      hasWebsite: !!place.website,
      hasPhone: !!place.phone,
      recentlyUpdated: true, // Would need to check last update
      verifiedBusiness: place.source !== "mock_data", // Real data is considered verified
    };

    const score =
      Object.values(indicators).filter(Boolean).length /
      Object.keys(indicators).length;

    return {
      ...indicators,
      qualityScore: Math.round(score * 100),
    };
  }

  checkForParking(types) {
    return types.includes("parking") || types.includes("establishment");
  }

  checkAccessibility(types) {
    // Most modern establishments are accessible
    return (
      !types.includes("tourist_attraction") &&
      !types.includes("natural_feature")
    );
  }

  checkReservations(types) {
    return (
      types.includes("restaurant") ||
      types.includes("doctor") ||
      types.includes("beauty_salon")
    );
  }

  assessAvailability(place, requestedTime) {
    if (!place.openingHours || !requestedTime) {
      return {
        status: "unknown",
        message: "Opening hours or requested time not available",
        confidence: 0.3,
        recommendation: "Call ahead to confirm availability",
      };
    }

    const requestedDate = new Date(requestedTime);
    const dayOfWeek = requestedDate.getDay();
    const timeString = requestedDate.toTimeString().slice(0, 5);

    // Simple availability check (would need more sophisticated parsing in production)
    const isBusinessHours =
      requestedDate.getHours() >= 9 && requestedDate.getHours() <= 21;

    return {
      status: isBusinessHours ? "likely_open" : "likely_closed",
      message: isBusinessHours
        ? "Business is likely to be open at the requested time"
        : "Business is likely to be closed at the requested time",
      confidence: 0.7,
      recommendation:
        "Please call to confirm availability and make a reservation if needed",
    };
  }

  generateTimeRecommendations(openingHours, requestedTime) {
    if (!openingHours) {
      return [
        "Call ahead to confirm hours",
        "Check their website for current hours",
        "Consider visiting during typical business hours (9 AM - 6 PM)",
      ];
    }

    return [
      "Check current opening hours before visiting",
      "Consider calling ahead for the best service",
      "Avoid peak hours (12-2 PM, 6-8 PM) for faster service",
      "Weekday mornings are typically less busy",
    ];
  }

  calculateOverallScore(place, criteria) {
    let score = 0;
    let maxScore = 0;

    // Rating importance
    if (criteria.ratingWeight) {
      const ratingScore = ((place.rating || 0) / 5) * criteria.ratingWeight;
      score += ratingScore;
      maxScore += criteria.ratingWeight;
    }

    // Distance importance
    if (criteria.distanceWeight && place.distance) {
      const distanceScore =
        Math.max(0, (10 - place.distance) / 10) * criteria.distanceWeight;
      score += distanceScore;
      maxScore += criteria.distanceWeight;
    }

    // Price importance
    if (criteria.priceWeight) {
      const priceScore =
        ((5 - (place.priceLevel || 2)) / 4) * criteria.priceWeight;
      score += priceScore;
      maxScore += criteria.priceWeight;
    }

    return maxScore > 0 ? score / maxScore : 0.5;
  }

  identifyPros(place, criteria) {
    const pros = [];

    if (place.rating >= 4.5) pros.push("Excellent rating");
    if (place.userRatingsTotal >= 100) pros.push("Many positive reviews");
    if (place.openNow) pros.push("Currently open");
    if (place.website) pros.push("Has website");
    if (place.phone) pros.push("Phone available");
    if (place.distance && place.distance < 2) pros.push("Very close");
    if (place.priceLevel === 1) pros.push("Budget-friendly");

    return pros;
  }

  identifyCons(place, criteria) {
    const cons = [];

    if (place.rating < 3.5) cons.push("Below average rating");
    if (place.userRatingsTotal < 10) cons.push("Few reviews");
    if (!place.openNow) cons.push("Currently closed");
    if (!place.phone) cons.push("No phone number");
    if (place.distance && place.distance > 10) cons.push("Far distance");
    if (place.priceLevel === 4) cons.push("Very expensive");

    return cons;
  }

  generateRecommendation(place, score, pros, cons) {
    if (score >= 0.8) {
      return {
        level: "highly_recommended",
        message: "Excellent choice with great ratings and convenient location",
        confidence: 0.9,
      };
    } else if (score >= 0.6) {
      return {
        level: "recommended",
        message: "Good option with solid ratings",
        confidence: 0.7,
      };
    } else if (score >= 0.4) {
      return {
        level: "consider",
        message: "Decent option but check reviews carefully",
        confidence: 0.5,
      };
    } else {
      return {
        level: "not_recommended",
        message: "May not be the best choice",
        confidence: 0.3,
      };
    }
  }

  generateComparisonInsights(comparison, criteria) {
    const insights = [];

    const topPlace = comparison[0];
    const avgRating =
      comparison.reduce((sum, p) => sum + (p.rating || 0), 0) /
      comparison.length;

    insights.push(
      `Top choice: ${topPlace.name} with a score of ${(
        topPlace.comparisonScore * 100
      ).toFixed(0)}%`
    );
    insights.push(`Average rating across options: ${avgRating.toFixed(1)}`);

    if (criteria.ratingWeight > criteria.distanceWeight) {
      insights.push("Rating was prioritized over distance in this comparison");
    }

    const openNow = comparison.filter((p) => p.openNow).length;
    if (openNow > 0) {
      insights.push(
        `${openNow} of ${comparison.length} options are currently open`
      );
    }

    const hasWebsite = comparison.filter((p) => p.website).length;
    if (hasWebsite > 0) {
      insights.push(`${hasWebsite} places have websites for more information`);
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
      search: 100, // Increased for free APIs
      details: 150, // Increased for free APIs
      nearby: 80, // Increased for free APIs
    };

    if (currentCount >= (limits[operation] || 50)) {
      return false;
    }

    this.rateLimitTracker.set(key, currentCount + 1);

    // Cleanup old entries
    for (const [k] of this.rateLimitTracker) {
      const keyTime = parseInt(k.split("_")[1]);
      if (now - keyTime * 60000 > 300000) {
        // 5 minutes old
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
