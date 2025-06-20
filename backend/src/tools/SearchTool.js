/**
 * Free SearchTool using Open Source APIs
 * Current Date and Time: 2025-06-20 15:10:51 UTC
 * Current User: ayush20244048
 */

import { Tool } from "@langchain/core/tools";
import axios from "axios";
import { logger } from "../utils/logger.js";

export class SearchTool extends Tool {
  constructor() {
    super();
    this.name = "google_search";
    this.description = `
      Use this tool to search for businesses, restaurants, and services using free APIs.
      
      Input should be a JSON string with:
      {
        "action": "search_places|get_details|find_nearby|get_reviews",
        "query": "search term",
        "location": "address or coordinates",
        "filters": {
          "type": "restaurant|doctor|dentist|etc",
          "radius": 5000,
          "minRating": 4.0,
          "priceLevel": "1-4",
          "openNow": true
        }
      }
    `;

    // Free APIs - no API keys needed!
    this.nominatimUrl = "https://nominatim.openstreetmap.org";
    this.overpassUrl = "https://overpass-api.de/api/interpreter";
    this.foursquareUrl = "https://api.foursquare.com/v3/places";

    // Optional: Foursquare API (free tier: 1000 requests/day)
    this.foursquareApiKey = process.env.FOURSQUARE_API_KEY; // Optional

    logger.info(
      "✅ SearchTool initialized with free APIs at 2025-06-20 15:10:51",
      {
        currentUser: "ayush20244048",
        apis: ["OpenStreetMap", "Overpass", "Nominatim"],
      }
    );
  }

  async _call(input) {
    try {
      logger.info("🔍 Free search API call at 2025-06-20 15:10:51:", {
        input: input.substring(0, 100),
        currentUser: "ayush20244048",
      });

      const { action, query, location, filters = {} } = JSON.parse(input);

      let result;
      switch (action) {
        case "search_places":
          result = await this.searchPlaces(query, location, filters);
          break;
        case "get_details":
          result = await this.getPlaceDetails(query);
          break;
        case "find_nearby":
          result = await this.findNearbyPlaces(location, filters);
          break;
        case "get_reviews":
          result = await this.getPlaceReviews(query);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      return JSON.stringify({
        success: true,
        action,
        result,
        metadata: {
          timestamp: "2025-06-20 15:10:51",
          location,
          query,
          currentUser: "ayush20244048",
          source: "free_apis",
        },
      });
    } catch (error) {
      logger.error("❌ Search tool error at 2025-06-20 15:10:51:", {
        error: error.message,
        currentUser: "ayush20244048",
      });

      return JSON.stringify({
        success: false,
        error: error.message,
        timestamp: "2025-06-20 15:10:51",
        currentUser: "ayush20244048",
      });
    }
  }

  /**
   * OPTION 1: OpenStreetMap + Overpass API (100% Free)
   */
  async searchPlaces(query, location, filters) {
    try {
      logger.info("🗺️ Searching with OpenStreetMap at 2025-06-20 15:10:51:", {
        query,
        location,
        currentUser: "ayush20244048",
      });

      // Step 1: Get coordinates for location
      const coordinates = await this.geocodeWithNominatim(location);

      // Step 2: Search for places using Overpass API
      const places = await this.searchWithOverpass(query, coordinates, filters);

      // Step 3: Apply filters and sorting
      const filteredPlaces = this.applyFilters(places, filters);
      const sortedPlaces = this.sortPlaces(
        filteredPlaces,
        filters.sortBy || "relevance"
      );

      const result = {
        places: sortedPlaces.slice(0, filters.limit || 10),
        totalFound: filteredPlaces.length,
        searchQuery: query,
        location: location || "",
        searchCenter: coordinates,
        source: "openstreetmap",
      };

      logger.info("✅ OpenStreetMap search completed at 2025-06-20 15:10:51:", {
        totalFound: result.totalFound,
        returned: result.places.length,
        currentUser: "ayush20244048",
      });

      return result;
    } catch (error) {
      logger.error(
        "❌ OpenStreetMap search failed at 2025-06-20 15:10:51:",
        error
      );

      // Fallback to mock data for development
      return this.getMockSearchResults(query, location, filters);
    }
  }

  /**
   * Geocoding with Nominatim (OpenStreetMap - Free)
   */
  async geocodeWithNominatim(location) {
    if (!location) {
      // Default to New York City
      return { lat: 40.7128, lng: -74.006 };
    }

    // If already coordinates
    if (typeof location === "object" && location.lat && location.lng) {
      return location;
    }

    try {
      const response = await axios.get(`${this.nominatimUrl}/search`, {
        params: {
          q: location,
          format: "json",
          limit: 1,
          addressdetails: 1,
        },
        headers: {
          "User-Agent": "OmniDimension/1.0 (ayush20244048@example.com)", // Required by Nominatim
        },
        timeout: 10000,
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
        };
      }

      throw new Error(`Location not found: ${location}`);
    } catch (error) {
      logger.warn(
        "⚠️ Geocoding failed, using default coordinates at 2025-06-20 15:10:51:",
        {
          location,
          error: error.message,
          currentUser: "ayush20244048",
        }
      );

      // Return default coordinates (NYC)
      return { lat: 40.7128, lng: -74.006 };
    }
  }

  /**
   * Search with Overpass API (OpenStreetMap - Free)
   */
  async searchWithOverpass(query, coordinates, filters) {
    try {
      const radius = filters.radius || 5000; // meters
      const amenityType = this.mapQueryToOSMType(query, filters.type);

      // Overpass QL query
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="${amenityType}"](around:${radius},${coordinates.lat},${coordinates.lng});
          way["amenity"="${amenityType}"](around:${radius},${coordinates.lat},${coordinates.lng});
          relation["amenity"="${amenityType}"](around:${radius},${coordinates.lat},${coordinates.lng});
        );
        out geom;
      `;

      const response = await axios.post(this.overpassUrl, overpassQuery, {
        headers: {
          "Content-Type": "text/plain",
        },
        timeout: 30000,
      });

      const osmData = response.data;
      const places = this.parseOverpassResponse(osmData, coordinates);

      logger.info("✅ Overpass API search completed at 2025-06-20 15:10:51:", {
        amenityType,
        placesFound: places.length,
        currentUser: "ayush20244048",
      });

      return places;
    } catch (error) {
      logger.warn(
        "⚠️ Overpass API failed, using fallback at 2025-06-20 15:10:51:",
        {
          error: error.message,
          currentUser: "ayush20244048",
        }
      );

      return [];
    }
  }

  /**
   * Map search terms to OpenStreetMap amenity types
   */
  mapQueryToOSMType(query, filterType) {
    const queryLower = query.toLowerCase();

    // Restaurant/Food mappings
    if (queryLower.includes("restaurant") || filterType === "restaurant")
      return "restaurant";
    if (queryLower.includes("cafe") || queryLower.includes("coffee"))
      return "cafe";
    if (queryLower.includes("bar") || queryLower.includes("pub")) return "bar";
    if (queryLower.includes("fast_food") || queryLower.includes("fast food"))
      return "fast_food";

    // Medical mappings
    if (
      queryLower.includes("doctor") ||
      queryLower.includes("medical") ||
      filterType === "doctor"
    )
      return "doctors";
    if (queryLower.includes("dentist") || filterType === "dentist")
      return "dentist";
    if (queryLower.includes("hospital") || filterType === "hospital")
      return "hospital";
    if (queryLower.includes("pharmacy") || filterType === "pharmacy")
      return "pharmacy";

    // Services
    if (queryLower.includes("bank")) return "bank";
    if (queryLower.includes("gas") || queryLower.includes("fuel"))
      return "fuel";
    if (queryLower.includes("school")) return "school";

    // Default
    return "restaurant"; // Most common search
  }

  /**
   * Parse Overpass API response into standardized format
   */
  parseOverpassResponse(osmData, searchCenter) {
    if (!osmData.elements) return [];

    return osmData.elements
      .map((element) => {
        const tags = element.tags || {};
        const lat = element.lat || (element.center ? element.center.lat : null);
        const lon = element.lon || (element.center ? element.center.lon : null);

        return {
          placeId: `osm_${element.type}_${element.id}`,
          name: tags.name || tags.brand || "Unnamed Place",
          address: this.formatOSMAddress(tags),
          rating: this.estimateRating(tags),
          userRatingsTotal: Math.floor(Math.random() * 100) + 10, // Mock data
          priceLevel: this.estimatePriceLevel(tags),
          types: [tags.amenity || "establishment"],
          location: lat && lon ? { lat, lng: lon } : null,
          openNow: this.checkOpenNow(tags.opening_hours),
          phone: tags.phone || tags["contact:phone"],
          website: tags.website || tags["contact:website"],
          cuisine: tags.cuisine,
          distance:
            lat && lon
              ? this.calculateDistance(searchCenter, { lat, lng: lon })
              : null,
          source: "openstreetmap",
          osmType: element.type,
          osmId: element.id,
        };
      })
      .filter((place) => place.location && place.name !== "Unnamed Place");
  }

  /**
   * Format OpenStreetMap address from tags
   */
  formatOSMAddress(tags) {
    const parts = [];
    if (tags["addr:housenumber"]) parts.push(tags["addr:housenumber"]);
    if (tags["addr:street"]) parts.push(tags["addr:street"]);
    if (tags["addr:city"]) parts.push(tags["addr:city"]);
    if (tags["addr:state"]) parts.push(tags["addr:state"]);
    if (tags["addr:postcode"]) parts.push(tags["addr:postcode"]);

    return parts.length > 0 ? parts.join(", ") : "Address not available";
  }

  /**
   * Estimate rating from OSM tags
   */
  estimateRating(tags) {
    // Basic heuristics for rating estimation
    let rating = 3.5; // Default

    if (tags.brand) rating += 0.3; // Branded places tend to be better
    if (tags.website) rating += 0.2; // Places with websites
    if (tags.phone) rating += 0.1; // Places with phone numbers
    if (tags.opening_hours) rating += 0.2; // Places with listed hours
    if (tags.wheelchair === "yes") rating += 0.1; // Accessible places

    return Math.min(5.0, Math.round(rating * 10) / 10);
  }

  /**
   * Estimate price level from OSM tags
   */
  estimatePriceLevel(tags) {
    if (tags.amenity === "fast_food") return 1;
    if (tags.amenity === "cafe") return 2;
    if (tags.amenity === "restaurant") {
      if (tags.cuisine === "fine_dining") return 4;
      return 3;
    }
    return 2; // Default
  }

  /**
   * Check if place is open now from opening_hours tag
   */
  checkOpenNow(openingHours) {
    if (!openingHours) return null;

    // Simple check - in production you'd parse the opening_hours format
    const now = new Date();
    const hour = now.getHours();

    // Business hours heuristic
    return hour >= 8 && hour <= 22;
  }

  /**
   * OPTION 2: Mock data for development/testing
   */
  getMockSearchResults(query, location, filters) {
    logger.info("🧪 Using mock search results at 2025-06-20 15:10:51:", {
      query,
      location,
      currentUser: "ayush20244048",
    });

    const mockPlaces = [
      {
        placeId: "mock_1",
        name: `${query} Restaurant #1`,
        address: `123 Main St, ${location || "New York"}, NY 10001`,
        rating: 4.5,
        userRatingsTotal: 150,
        priceLevel: 2,
        types: ["restaurant", "food"],
        location: { lat: 40.7128, lng: -74.006 },
        openNow: true,
        phone: "+1 (555) 123-4567",
        website: "https://example.com/restaurant1",
        source: "mock_data",
      },
      {
        placeId: "mock_2",
        name: `${query} Restaurant #2`,
        address: `456 Oak Ave, ${location || "New York"}, NY 10002`,
        rating: 4.2,
        userRatingsTotal: 89,
        priceLevel: 3,
        types: ["restaurant", "food"],
        location: { lat: 40.7589, lng: -73.9851 },
        openNow: false,
        phone: "+1 (555) 234-5678",
        website: null,
        source: "mock_data",
      },
      {
        placeId: "mock_3",
        name: `Best ${query} Place`,
        address: `789 Pine St, ${location || "New York"}, NY 10003`,
        rating: 4.8,
        userRatingsTotal: 203,
        priceLevel: 1,
        types: ["restaurant", "food"],
        location: { lat: 40.7282, lng: -73.7949 },
        openNow: true,
        phone: "+1 (555) 345-6789",
        website: "https://example.com/best-place",
        source: "mock_data",
      },
    ];

    const filteredPlaces = this.applyFilters(mockPlaces, filters);

    return {
      places: filteredPlaces.slice(0, filters.limit || 10),
      totalFound: filteredPlaces.length,
      searchQuery: query,
      location: location || "",
      source: "mock_data",
    };
  }

  /**
   * Nearby places using OpenStreetMap
   */
  async findNearbyPlaces(location, filters) {
    try {
      const coordinates = await this.geocodeWithNominatim(location);

      // Use a generic amenity search for nearby places
      const query = filters.type || "restaurant";
      return await this.searchPlaces(query, location, {
        ...filters,
        radius: filters.radius || 2000, // Smaller radius for nearby search
      });
    } catch (error) {
      logger.error("❌ Nearby search failed at 2025-06-20 15:10:51:", error);
      return this.getMockSearchResults("nearby places", location, filters);
    }
  }

  /**
   * Get place details
   */
  async getPlaceDetails(placeId) {
    try {
      logger.info("📍 Getting place details at 2025-06-20 15:10:51:", {
        placeId,
        currentUser: "ayush20244048",
      });

      // For OSM places, extract type and ID
      if (placeId.startsWith("osm_")) {
        const [, osmType, osmId] = placeId.split("_");
        return await this.getOSMPlaceDetails(osmType, osmId);
      }

      // For mock places, return mock details
      return {
        placeId,
        name: "Sample Restaurant",
        address: "123 Main St, New York, NY 10001",
        phone: "+1 (555) 123-4567",
        website: "https://example.com",
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
        reviews: [
          {
            author: "John D.",
            rating: 5,
            text: "Great food and excellent service!",
            time: Date.now() - 86400000, // 1 day ago
          },
          {
            author: "Sarah M.",
            rating: 4,
            text: "Good atmosphere, food was tasty.",
            time: Date.now() - 172800000, // 2 days ago
          },
        ],
        photos: [],
        types: ["restaurant", "food"],
        source: "mock_data",
      };
    } catch (error) {
      logger.error("❌ Place details failed at 2025-06-20 15:10:51:", error);
      throw error;
    }
  }

  /**
   * Get reviews for a place
   */
  async getPlaceReviews(placeId) {
    const details = await this.getPlaceDetails(placeId);
    return details.reviews || [];
  }

  /**
   * Helper methods
   */
  applyFilters(places, filters) {
    return places.filter((place) => {
      if (filters.minRating && place.rating < filters.minRating) return false;
      if (filters.priceLevel && place.priceLevel > filters.priceLevel)
        return false;
      if (filters.openNow && !place.openNow) return false;
      if (filters.minReviews && place.userRatingsTotal < filters.minReviews)
        return false;
      return true;
    });
  }

  sortPlaces(places, sortBy) {
    switch (sortBy) {
      case "rating":
        return places.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "distance":
        return places.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      case "reviews":
        return places.sort(
          (a, b) => (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0)
        );
      default:
        return places.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
  }

  calculateDistance(coord1, coord2) {
    if (!coord1 || !coord2) return null;

    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.lat)) *
        Math.cos(this.toRadians(coord2.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  calculateScore(place) {
    if (!place.rating) return 0;

    const ratingScore = place.rating / 5;
    const reviewScore = Math.min(place.userRatingsTotal / 100, 1);

    return ratingScore * 0.7 + reviewScore * 0.3;
  }
}

export default SearchTool;
