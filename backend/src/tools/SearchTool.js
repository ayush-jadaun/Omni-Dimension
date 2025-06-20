import { Tool } from '@langchain/core/tools';
import axios from 'axios';
import { logger } from '../utils/logger.js';

export class SearchTool extends Tool {
  constructor() {
    super();
    this.name = 'google_search';
    this.description = `
      Use this tool to search for businesses, restaurants, and services using Google Places API.
      
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
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
  }

  async _call(input) {
    try {
      if (!this.apiKey) {
        throw new Error('Google Maps API key not configured');
      }

      const { action, query, location, filters = {} } = JSON.parse(input);

      let result;
      switch (action) {
        case 'search_places':
          result = await this.searchPlaces(query, location, filters);
          break;
        case 'get_details':
          result = await this.getPlaceDetails(query); // query is placeId here
          break;
        case 'find_nearby':
          result = await this.findNearbyPlaces(location, filters);
          break;
        case 'get_reviews':
          result = await this.getPlaceReviews(query); // query is placeId here
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }

      return JSON.stringify({
        success: true,
        action,
        result,
        metadata: {
          timestamp: new Date().toISOString(),
          location,
          query
        }
      });

    } catch (error) {
      logger.error('Search tool error:', error);
      return JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async searchPlaces(query, location, filters) {
    try {
      const searchQuery = `${query} ${location}`;
      
      const response = await axios.get(`${this.baseUrl}/textsearch/json`, {
        params: {
          query: searchQuery,
          key: this.apiKey,
          type: filters.type || 'establishment',
          radius: filters.radius || 5000,
          language: 'en'
        },
        timeout: 10000
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      let places = response.data.results.map(place => ({
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        priceLevel: place.price_level,
        types: place.types,
        location: place.geometry.location,
        openNow: place.opening_hours?.open_now,
        photos: place.photos?.slice(0, 3).map(photo => ({
          reference: photo.photo_reference,
          width: photo.width,
          height: photo.height
        }))
      }));

      // Apply filters
      places = this.applyFilters(places, filters);

      // Sort by rating and review count
      places.sort((a, b) => {
        const scoreA = this.calculateScore(a);
        const scoreB = this.calculateScore(b);
        return scoreB - scoreA;
      });

      return {
        places: places.slice(0, filters.limit || 10),
        totalFound: places.length,
        searchQuery,
        location
      };

    } catch (error) {
      logger.error('Error searching places:', error);
      throw error;
    }
  }

  async getPlaceDetails(placeId) {
    try {
      const response = await axios.get(`${this.baseUrl}/details/json`, {
        params: {
          place_id: placeId,
          fields: 'name,formatted_address,formatted_phone_number,website,opening_hours,rating,reviews,photos,types',
          key: this.apiKey
        },
        timeout: 10000
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      const place = response.data.result;

      return {
        placeId,
        name: place.name,
        address: place.formatted_address,
        phone: place.formatted_phone_number,
        website: place.website,
        rating: place.rating,
        openingHours: place.opening_hours,
        reviews: place.reviews?.map(review => ({
          author: review.author_name,
          rating: review.rating,
          text: review.text,
          time: review.time,
          profilePhoto: review.profile_photo_url
        })),
        photos: place.photos?.map(photo => ({
          reference: photo.photo_reference,
          width: photo.width,
          height: photo.height
        })),
        types: place.types
      };

    } catch (error) {
      logger.error('Error getting place details:', error);
      throw error;
    }
  }

  async findNearbyPlaces(location, filters) {
    try {
      // Parse location if it's a string address
      let coordinates;
      if (typeof location === 'string') {
        coordinates = await this.geocodeAddress(location);
      } else {
        coordinates = location;
      }

      const response = await axios.get(`${this.baseUrl}/nearbysearch/json`, {
        params: {
          location: `${coordinates.lat},${coordinates.lng}`,
          radius: filters.radius || 5000,
          type: filters.type || 'establishment',
          keyword: filters.keyword,
          key: this.apiKey,
          language: 'en'
        },
        timeout: 10000
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      let places = response.data.results.map(place => ({
        placeId: place.place_id,
        name: place.name,
        vicinity: place.vicinity,
        rating: place.rating,
        userRatingsTotal: place.user_ratings_total,
        priceLevel: place.price_level,
        types: place.types,
        location: place.geometry.location,
        openNow: place.opening_hours?.open_now
      }));

      // Apply filters
      places = this.applyFilters(places, filters);

      return {
        places: places.slice(0, filters.limit || 20),
        center: coordinates,
        radius: filters.radius || 5000
      };

    } catch (error) {
      logger.error('Error finding nearby places:', error);
      throw error;
    }
  }

  async geocodeAddress(address) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address,
          key: this.apiKey
        },
        timeout: 5000
      });

      if (response.data.status !== 'OK' || response.data.results.length === 0) {
        throw new Error(`Geocoding failed for address: ${address}`);
      }

      return response.data.results[0].geometry.location;

    } catch (error) {
      logger.error('Geocoding error:', error);
      throw error;
    }
  }

  applyFilters(places, filters) {
    return places.filter(place => {
      // Rating filter
      if (filters.minRating && place.rating < filters.minRating) {
        return false;
      }

      // Price level filter
      if (filters.priceLevel && place.priceLevel !== filters.priceLevel) {
        return false;
      }

      // Open now filter
      if (filters.openNow && !place.openNow) {
        return false;
      }

      // Minimum reviews filter
      if (filters.minReviews && place.userRatingsTotal < filters.minReviews) {
        return false;
      }

      return true;
    });
  }

  calculateScore(place) {
    if (!place.rating) return 0;
    
    const ratingScore = place.rating / 5; // Normalize to 0-1
    const reviewScore = Math.min(place.userRatingsTotal / 100, 1); // Cap at 100 reviews for score
    
    return (ratingScore * 0.7) + (reviewScore * 0.3);
  }

  async getPlaceReviews(placeId) {
    const details = await this.getPlaceDetails(placeId);
    return details.reviews || [];
  }
}

export default SearchTool;