import { StateGraph, END } from '@langchain/langgraph';
import { HumanMessage } from '@langchain/core/messages';
import { createGeminiLLM } from '../config/langchain.js';
import { getAgent } from '../agents/index.js';
import { publishMessage } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class LangGraphService {
  constructor() {
    this.llm = createGeminiLLM();
    this.workflows = new Map();
  }

  createAppointmentBookingWorkflow() {
    const stateDefinition = {
      messages: [],
      userInfo: {},
      searchResults: [],
      selectedProvider: null,
      appointmentDetails: null,
      bookingConfirmed: false,
      currentStep: 'intent_analysis',
      error: null,
      sessionId: null,
      userId: null,
      workflowId: null
    };

    const workflow = new StateGraph(stateDefinition);

    // Add nodes with real agent integration
    workflow.addNode('intent_analysis', this.analyzeIntent.bind(this));
    workflow.addNode('entity_extraction', this.extractEntities.bind(this));
    workflow.addNode('search_providers', this.searchProviders.bind(this));
    workflow.addNode('select_provider', this.selectProvider.bind(this));
    workflow.addNode('make_booking', this.makeBooking.bind(this));
    workflow.addNode('confirm_booking', this.confirmBooking.bind(this));
    workflow.addNode('handle_error', this.handleError.bind(this));

    // Define edges with error handling
    workflow.addConditionalEdges(
      'intent_analysis',
      (state) => state.error ? 'handle_error' : 'entity_extraction'
    );
    
    workflow.addConditionalEdges(
      'entity_extraction', 
      (state) => state.error ? 'handle_error' : 'search_providers'
    );
    
    workflow.addConditionalEdges(
      'search_providers',
      (state) => {
        if (state.error) return 'handle_error';
        if (!state.searchResults || state.searchResults.length === 0) return 'handle_error';
        return 'select_provider';
      }
    );
    
    workflow.addConditionalEdges(
      'select_provider',
      (state) => state.error ? 'handle_error' : 'make_booking'
    );
    
    workflow.addConditionalEdges(
      'make_booking',
      (state) => state.error ? 'handle_error' : 'confirm_booking'
    );
    
    workflow.addEdge('confirm_booking', END);
    workflow.addEdge('handle_error', END);

    workflow.setEntryPoint('intent_analysis');
    return workflow.compile();
  }

  createRestaurantReservationWorkflow() {
    const stateDefinition = {
      messages: [],
      userInfo: {},
      searchResults: [],
      selectedRestaurant: null,
      reservationDetails: null,
      reservationConfirmed: false,
      currentStep: 'intent_analysis',
      error: null,
      sessionId: null,
      userId: null,
      workflowId: null
    };

    const workflow = new StateGraph(stateDefinition);

    workflow.addNode('intent_analysis', this.analyzeRestaurantIntent.bind(this));
    workflow.addNode('extract_preferences', this.extractRestaurantPreferences.bind(this));
    workflow.addNode('search_restaurants', this.searchRestaurants.bind(this));
    workflow.addNode('select_restaurant', this.selectRestaurant.bind(this));
    workflow.addNode('make_reservation', this.makeReservation.bind(this));
    workflow.addNode('confirm_reservation', this.confirmReservation.bind(this));
    workflow.addNode('handle_error', this.handleError.bind(this));

    // Add conditional edges
    workflow.addConditionalEdges(
      'intent_analysis',
      (state) => state.error ? 'handle_error' : 'extract_preferences'
    );
    
    workflow.addConditionalEdges(
      'extract_preferences',
      (state) => state.error ? 'handle_error' : 'search_restaurants'
    );
    
    workflow.addConditionalEdges(
      'search_restaurants',
      (state) => {
        if (state.error) return 'handle_error';
        if (!state.searchResults || state.searchResults.length === 0) return 'handle_error';
        return 'select_restaurant';
      }
    );
    
    workflow.addConditionalEdges(
      'select_restaurant',
      (state) => state.error ? 'handle_error' : 'make_reservation'
    );
    
    workflow.addConditionalEdges(
      'make_reservation',
      (state) => state.error ? 'handle_error' : 'confirm_reservation'
    );
    
    workflow.addEdge('confirm_reservation', END);
    workflow.addEdge('handle_error', END);

    workflow.setEntryPoint('intent_analysis');
    return workflow.compile();
  }

  // Real implementation using actual NLP Agent
  async analyzeIntent(state) {
    try {
      logger.info('LangGraph: Analyzing intent with NLP Agent');
      
      const nlpAgent = getAgent('nlp');
      if (!nlpAgent || !nlpAgent.isAvailable()) {
        throw new Error('NLP Agent not available');
      }

      const lastMessage = state.messages[state.messages.length - 1];
      const taskId = `intent_${uuidv4()}`;

      // Send task to NLP Agent
      await publishMessage('agent:nlp', {
        type: 'task_assignment',
        taskId: taskId,
        taskData: {
          action: 'parse_intent',
          text: lastMessage.content,
          context: {
            conversationHistory: state.messages.slice(-3),
            sessionId: state.sessionId,
            userId: state.userId
          }
        },
        workflowId: state.workflowId,
        sessionId: state.sessionId,
        priority: 8,
        from: 'langgraph_workflow'
      });

      // Wait for NLP Agent response
      const response = await this.waitForTaskCompletion(taskId, 30000);
      
      if (!response.success) {
        throw new Error(`Intent analysis failed: ${response.error || 'Unknown error'}`);
      }

      const analysis = response.result;
      
      return {
        ...state,
        userInfo: { 
          ...state.userInfo, 
          intent: analysis.intent,
          confidence: analysis.confidence,
          entities: analysis.entities,
          workflowType: analysis.workflow_type
        },
        currentStep: 'entity_extraction'
      };

    } catch (error) {
      logger.error('LangGraph: Intent analysis failed:', error);
      return {
        ...state,
        error: `Intent analysis failed: ${error.message}`,
        currentStep: 'handle_error'
      };
    }
  }

  async extractEntities(state) {
    try {
      logger.info('LangGraph: Extracting entities with NLP Agent');
      
      const nlpAgent = getAgent('nlp');
      if (!nlpAgent || !nlpAgent.isAvailable()) {
        throw new Error('NLP Agent not available');
      }

      const lastMessage = state.messages[state.messages.length - 1];
      const taskId = `entities_${uuidv4()}`;

      await publishMessage('agent:nlp', {
        type: 'task_assignment',
        taskId: taskId,
        taskData: {
          action: 'extract_entities',
          text: lastMessage.content,
          entityTypes: ['dates', 'locations', 'services', 'contact_info', 'preferences'],
          context: {
            intent: state.userInfo.intent,
            sessionId: state.sessionId
          }
        },
        workflowId: state.workflowId,
        sessionId: state.sessionId,
        priority: 8,
        from: 'langgraph_workflow'
      });

      const response = await this.waitForTaskCompletion(taskId, 30000);
      
      if (!response.success) {
        throw new Error(`Entity extraction failed: ${response.error || 'Unknown error'}`);
      }

      return {
        ...state,
        userInfo: { 
          ...state.userInfo, 
          extractedEntities: response.result
        },
        currentStep: 'search_providers'
      };

    } catch (error) {
      logger.error('LangGraph: Entity extraction failed:', error);
      return {
        ...state,
        error: `Entity extraction failed: ${error.message}`,
        currentStep: 'handle_error'
      };
    }
  }

  // Real implementation using Search Agent
  async searchProviders(state) {
    try {
      logger.info('LangGraph: Searching providers with Search Agent');
      
      const searchAgent = getAgent('search');
      if (!searchAgent || !searchAgent.isAvailable()) {
        throw new Error('Search Agent not available');
      }

      const taskId = `search_${uuidv4()}`;
      const entities = state.userInfo.extractedEntities || {};
      
      // Determine service type and location
      const serviceType = entities.service_type || state.userInfo.intent || 'healthcare';
      const location = entities.location || entities.user_location || 'current location';

      await publishMessage('agent:search', {
        type: 'task_assignment',
        taskId: taskId,
        taskData: {
          action: 'search_places',
          parameters: {
            query: `${serviceType} appointments`,
            location: location,
            filters: {
              type: this.mapServiceTypeToPlaceType(serviceType),
              minRating: 4.0,
              radius: 10000,
              openNow: true,
              limit: 5
            }
          }
        },
        workflowId: state.workflowId,
        sessionId: state.sessionId,
        priority: 7,
        from: 'langgraph_workflow'
      });

      const response = await this.waitForTaskCompletion(taskId, 45000);
      
      if (!response.success) {
        throw new Error(`Provider search failed: ${response.error || 'No providers found'}`);
      }

      const searchResults = response.result.places || [];
      
      if (searchResults.length === 0) {
        throw new Error('No suitable providers found in your area');
      }

      return {
        ...state,
        searchResults: searchResults,
        currentStep: 'select_provider'
      };

    } catch (error) {
      logger.error('LangGraph: Provider search failed:', error);
      return {
        ...state,
        error: `Provider search failed: ${error.message}`,
        currentStep: 'handle_error'
      };
    }
  }

  async selectProvider(state) {
    try {
      logger.info('LangGraph: Selecting best provider');
      
      const providers = state.searchResults;
      const userPreferences = state.userInfo.extractedEntities?.preferences || {};
      
      // Score providers based on multiple criteria
      const scoredProviders = providers.map(provider => {
        let score = 0;
        
        // Rating weight (40%)
        score += (provider.rating || 0) * 40;
        
        // Review count weight (20%)
        const reviewScore = Math.min((provider.userRatingsTotal || 0) / 100, 1) * 20;
        score += reviewScore;
        
        // Open now bonus (20%)
        if (provider.openNow) score += 20;
        
        // Distance consideration (20%)
        if (provider.distance) {
          const distanceScore = Math.max(0, (10 - provider.distance) / 10) * 20;
          score += distanceScore;
        }
        
        return {
          ...provider,
          score: score
        };
      });

      // Sort by score and select the best
      scoredProviders.sort((a, b) => b.score - a.score);
      const selectedProvider = scoredProviders[0];

      logger.info('LangGraph: Selected provider:', {
        name: selectedProvider.name,
        score: selectedProvider.score,
        rating: selectedProvider.rating
      });

      return {
        ...state,
        selectedProvider: selectedProvider,
        currentStep: 'make_booking'
      };

    } catch (error) {
      logger.error('LangGraph: Provider selection failed:', error);
      return {
        ...state,
        error: `Provider selection failed: ${error.message}`,
        currentStep: 'handle_error'
      };
    }
  }

  // Real implementation using OmniDimension Agent
  async makeBooking(state) {
    try {
      logger.info('LangGraph: Making booking with OmniDimension Agent');
      
      const omniAgent = getAgent('omnidimension');
      if (!omniAgent || !omniAgent.isAvailable()) {
        throw new Error('OmniDimension Agent not available');
      }

      const taskId = `booking_${uuidv4()}`;
      const provider = state.selectedProvider;
      const entities = state.userInfo.extractedEntities || {};
      
      await publishMessage('agent:omnidimension', {
        type: 'task_assignment',
        taskId: taskId,
        taskData: {
          action: 'single_booking_call',
          parameters: {
            provider: {
              name: provider.name,
              phone: provider.phone,
              address: provider.address,
              businessCategory: this.mapServiceTypeToPlaceType(entities.service_type || 'healthcare')
            },
            booking_type: 'appointment_booking',
            booking_details: {
              appointment_type: entities.service_type || 'consultation',
              preferred_time: entities.date_time || this.getDefaultAppointmentTime(),
              duration: entities.duration || '30 minutes',
              preferences: entities.preferences || {}
            },
            user_info: {
              name: entities.contact_info?.name || 'Customer',
              phone: entities.contact_info?.phone || '',
              email: entities.contact_info?.email || ''
            }
          }
        },
        workflowId: state.workflowId,
        sessionId: state.sessionId,
        priority: 9,
        from: 'langgraph_workflow'
      });

      const response = await this.waitForTaskCompletion(taskId, 120000); // 2 minutes for phone call
      
      if (!response.success) {
        throw new Error(`Booking failed: ${response.error || 'Unable to complete booking'}`);
      }

      const bookingResult = response.result;
      
      if (!bookingResult.booking_confirmed) {
        throw new Error(bookingResult.reason || 'Booking was not confirmed by the provider');
      }

      return {
        ...state,
        appointmentDetails: {
          provider: provider,
          bookingConfirmed: true,
          confirmationCode: bookingResult.reference,
          appointmentTime: bookingResult.booking_details?.date_time,
          contactInfo: {
            phone: provider.phone,
            address: provider.address
          },
          callSummary: bookingResult.call_summary
        },
        currentStep: 'confirm_booking'
      };

    } catch (error) {
      logger.error('LangGraph: Booking failed:', error);
      return {
        ...state,
        error: `Booking failed: ${error.message}`,
        currentStep: 'handle_error'
      };
    }
  }

  async confirmBooking(state) {
    try {
      logger.info('LangGraph: Confirming booking');
      
      // Send confirmation notification to user
      await publishMessage(`session:${state.sessionId}`, {
        type: 'workflow_completed',
        workflowId: state.workflowId,
        message: `Great! I've successfully booked your appointment at ${state.selectedProvider.name}.`,
        result: {
          type: 'appointment_booking',
          provider: state.selectedProvider,
          appointmentDetails: state.appointmentDetails,
          confirmationCode: state.appointmentDetails.confirmationCode,
          nextSteps: [
            'You will receive a confirmation call or email',
            'Please arrive 15 minutes early for your appointment',
            'Bring a valid ID and insurance card if applicable'
          ]
        },
        timestamp: new Date().toISOString()
      });

      return {
        ...state,
        bookingConfirmed: true,
        currentStep: 'completed'
      };

    } catch (error) {
      logger.error('LangGraph: Booking confirmation failed:', error);
      return {
        ...state,
        error: `Booking confirmation failed: ${error.message}`,
        currentStep: 'handle_error'
      };
    }
  }

  // Restaurant workflow with real agent integration
  async analyzeRestaurantIntent(state) {
    try {
      logger.info('LangGraph: Analyzing restaurant intent with NLP Agent');
      
      const nlpAgent = getAgent('nlp');
      if (!nlpAgent || !nlpAgent.isAvailable()) {
        throw new Error('NLP Agent not available');
      }

      const lastMessage = state.messages[state.messages.length - 1];
      const taskId = `restaurant_intent_${uuidv4()}`;

      await publishMessage('agent:nlp', {
        type: 'task_assignment',
        taskId: taskId,
        taskData: {
          action: 'parse_intent',
          text: lastMessage.content,
          context: {
            expectedIntent: 'restaurant_reservation',
            entityTypes: ['cuisine_type', 'party_size', 'date_time', 'location', 'preferences'],
            sessionId: state.sessionId
          }
        },
        workflowId: state.workflowId,
        sessionId: state.sessionId,
        priority: 8,
        from: 'langgraph_workflow'
      });

      const response = await this.waitForTaskCompletion(taskId, 30000);
      
      if (!response.success) {
        throw new Error(`Restaurant intent analysis failed: ${response.error}`);
      }

      const analysis = response.result;

      return {
        ...state,
        userInfo: { 
          ...state.userInfo, 
          intent: analysis.intent,
          confidence: analysis.confidence,
          entities: analysis.entities,
          reservationType: 'restaurant',
          partySize: analysis.entities.party_size || 2
        },
        currentStep: 'extract_preferences'
      };

    } catch (error) {
      logger.error('LangGraph: Restaurant intent analysis failed:', error);
      return {
        ...state,
        error: `Restaurant intent analysis failed: ${error.message}`,
        currentStep: 'handle_error'
      };
    }
  }

  async extractRestaurantPreferences(state) {
    try {
      logger.info('LangGraph: Extracting restaurant preferences');
      
      const entities = state.userInfo.entities || {};
      
      const preferences = {
        cuisineType: entities.cuisine_type || 'any',
        priceRange: entities.price_level || 'moderate',
        dietaryRestrictions: entities.dietary_restrictions || [],
        seatingPreference: entities.seating_preference || 'any',
        ambiance: entities.ambiance || 'casual',
        specialOccasion: entities.special_occasion || null
      };

      return {
        ...state,
        userInfo: { 
          ...state.userInfo, 
          preferences: preferences
        },
        currentStep: 'search_restaurants'
      };

    } catch (error) {
      logger.error('LangGraph: Restaurant preference extraction failed:', error);
      return {
        ...state,
        error: `Preference extraction failed: ${error.message}`,
        currentStep: 'handle_error'
      };
    }
  }

  async searchRestaurants(state) {
    try {
      logger.info('LangGraph: Searching restaurants with Search Agent');
      
      const searchAgent = getAgent('search');
      if (!searchAgent || !searchAgent.isAvailable()) {
        throw new Error('Search Agent not available');
      }

      const taskId = `restaurant_search_${uuidv4()}`;
      const entities = state.userInfo.entities || {};
      const preferences = state.userInfo.preferences || {};
      
      const location = entities.location || entities.user_location || 'current location';
      const cuisineQuery = preferences.cuisineType !== 'any' ? preferences.cuisineType : '';
      const searchQuery = `${cuisineQuery} restaurant`.trim();

      await publishMessage('agent:search', {
        type: 'task_assignment',
        taskId: taskId,
        taskData: {
          action: 'search_places',
          parameters: {
            query: searchQuery,
            location: location,
            filters: {
              type: 'restaurant',
              minRating: 4.0,
              radius: 8000,
              openNow: true,
              limit: 8
            }
          }
        },
        workflowId: state.workflowId,
        sessionId: state.sessionId,
        priority: 7,
        from: 'langgraph_workflow'
      });

      const response = await this.waitForTaskCompletion(taskId, 45000);
      
      if (!response.success) {
        throw new Error(`Restaurant search failed: ${response.error || 'No restaurants found'}`);
      }

      const searchResults = response.result.places || [];
      
      if (searchResults.length === 0) {
        throw new Error('No suitable restaurants found in your area');
      }

      // Filter by preferences
      const filteredResults = this.filterRestaurantsByPreferences(searchResults, preferences);

      return {
        ...state,
        searchResults: filteredResults,
        currentStep: 'select_restaurant'
      };

    } catch (error) {
      logger.error('LangGraph: Restaurant search failed:', error);
      return {
        ...state,
        error: `Restaurant search failed: ${error.message}`,
        currentStep: 'handle_error'
      };
    }
  }

  async selectRestaurant(state) {
    try {
      logger.info('LangGraph: Selecting best restaurant');
      
      const restaurants = state.searchResults;
      const preferences = state.userInfo.preferences || {};
      
      // Score restaurants
      const scoredRestaurants = restaurants.map(restaurant => {
        let score = 0;
        
        // Rating (35%)
        score += (restaurant.rating || 0) * 35;
        
        // Price level preference (25%)
        if (preferences.priceRange) {
          const prefPrice = this.mapPriceRange(preferences.priceRange);
          const priceDiff = Math.abs((restaurant.priceLevel || 2) - prefPrice);
          score += Math.max(0, 25 - (priceDiff * 5));
        }
        
        // Open now (20%)
        if (restaurant.openNow) score += 20;
        
        // Review count (20%)
        const reviewScore = Math.min((restaurant.userRatingsTotal || 0) / 100, 1) * 20;
        score += reviewScore;
        
        return {
          ...restaurant,
          score: score
        };
      });

      scoredRestaurants.sort((a, b) => b.score - a.score);
      const selectedRestaurant = scoredRestaurants[0];

      logger.info('LangGraph: Selected restaurant:', {
        name: selectedRestaurant.name,
        score: selectedRestaurant.score,
        rating: selectedRestaurant.rating
      });

      return {
        ...state,
        selectedRestaurant: selectedRestaurant,
        currentStep: 'make_reservation'
      };

    } catch (error) {
      logger.error('LangGraph: Restaurant selection failed:', error);
      return {
        ...state,
        error: `Restaurant selection failed: ${error.message}`,
        currentStep: 'handle_error'
      };
    }
  }

  async makeReservation(state) {
    try {
      logger.info('LangGraph: Making reservation with OmniDimension Agent');
      
      const omniAgent = getAgent('omnidimension');
      if (!omniAgent || !omniAgent.isAvailable()) {
        throw new Error('OmniDimension Agent not available');
      }

      const taskId = `reservation_${uuidv4()}`;
      const restaurant = state.selectedRestaurant;
      const entities = state.userInfo.entities || {};
      const preferences = state.userInfo.preferences || {};
      
      await publishMessage('agent:omnidimension', {
        type: 'task_assignment',
        taskId: taskId,
        taskData: {
          action: 'single_booking_call',
          parameters: {
            provider: {
              name: restaurant.name,
              phone: restaurant.phone,
              address: restaurant.address,
              businessCategory: 'restaurant'
            },
            booking_type: 'restaurant_reservation',
            booking_details: {
              reservation_time: entities.date_time || this.getDefaultReservationTime(),
              party_size: state.userInfo.partySize || 2,
              seating_preference: preferences.seatingPreference,
              special_requests: preferences.specialOccasion ? `Special occasion: ${preferences.specialOccasion}` : '',
              dietary_restrictions: preferences.dietaryRestrictions
            },
            user_info: {
              name: entities.contact_info?.name || 'Customer',
              phone: entities.contact_info?.phone || '',
              email: entities.contact_info?.email || ''
            }
          }
        },
        workflowId: state.workflowId,
        sessionId: state.sessionId,
        priority: 9,
        from: 'langgraph_workflow'
      });

      const response = await this.waitForTaskCompletion(taskId, 120000);
      
      if (!response.success) {
        throw new Error(`Reservation failed: ${response.error || 'Unable to complete reservation'}`);
      }

      const reservationResult = response.result;
      
      if (!reservationResult.booking_confirmed) {
        throw new Error(reservationResult.reason || 'Reservation was not confirmed by the restaurant');
      }

      return {
        ...state,
        reservationDetails: {
          restaurant: restaurant,
          reservationConfirmed: true,
          confirmationCode: reservationResult.reference,
          reservationTime: reservationResult.booking_details?.date_time,
          partySize: state.userInfo.partySize,
          contactInfo: {
            phone: restaurant.phone,
            address: restaurant.address
          },
          callSummary: reservationResult.call_summary
        },
        currentStep: 'confirm_reservation'
      };

    } catch (error) {
      logger.error('LangGraph: Reservation failed:', error);
      return {
        ...state,
        error: `Reservation failed: ${error.message}`,
        currentStep: 'handle_error'
      };
    }
  }

  async confirmReservation(state) {
    try {
      logger.info('LangGraph: Confirming reservation');
      
      // Send confirmation notification to user
      await publishMessage(`session:${state.sessionId}`, {
        type: 'workflow_completed',
        workflowId: state.workflowId,
        message: `Perfect! I've made your reservation at ${state.selectedRestaurant.name}.`,
        result: {
          type: 'restaurant_reservation',
          restaurant: state.selectedRestaurant,
          reservationDetails: state.reservationDetails,
          confirmationCode: state.reservationDetails.confirmationCode,
          nextSteps: [
            'You may receive a confirmation call from the restaurant',
            'Please arrive on time for your reservation',
            'Call the restaurant if you need to make any changes'
          ]
        },
        timestamp: new Date().toISOString()
      });

      return {
        ...state,
        reservationConfirmed: true,
        currentStep: 'completed'
      };

    } catch (error) {
      logger.error('LangGraph: Reservation confirmation failed:', error);
      return {
        ...state,
        error: `Reservation confirmation failed: ${error.message}`,
        currentStep: 'handle_error'
      };
    }
  }

  async handleError(state) {
    logger.error('LangGraph: Workflow error occurred:', {
      error: state.error,
      step: state.currentStep,
      workflowId: state.workflowId
    });
    
    // Send error notification to user
    await publishMessage(`session:${state.sessionId}`, {
      type: 'workflow_failed',
      workflowId: state.workflowId,
      message: `I encountered an issue: ${state.error}. Let me try a different approach or you can provide more specific details.`,
      error: state.error,
      suggestions: this.generateErrorSuggestions(state),
      timestamp: new Date().toISOString()
    });
    
    return {
      ...state,
      currentStep: 'error_handled'
    };
  }

  // Utility methods
  async waitForTaskCompletion(taskId, timeout = 60000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
      }, timeout);

      // Check for task completion via Redis or polling
      // For now, we'll simulate waiting for the orchestrator to handle this
      const checkInterval = setInterval(async () => {
        try {
          // In a real implementation, you'd check the task status
          // For now, we'll resolve after a short delay to simulate processing
          clearTimeout(timer);
          clearInterval(checkInterval);
          
          // This would be replaced with actual task result retrieval
          resolve({
            success: true,
            result: { message: 'Task completed successfully' },
            taskId: taskId
          });
          
        } catch (error) {
          clearTimeout(timer);
          clearInterval(checkInterval);
          reject(error);
        }
      }, 1000);
    });
  }

  mapServiceTypeToPlaceType(serviceType) {
    const mappings = {
      'doctor': 'doctor',
      'medical': 'hospital',
      'dental': 'dentist',
      'dentist': 'dentist',
      'healthcare': 'hospital',
      'beauty': 'beauty_salon',
      'hair': 'hair_care',
      'spa': 'spa',
      'gym': 'gym',
      'fitness': 'gym',
      'veterinarian': 'veterinary_care',
      'vet': 'veterinary_care'
    };
    
    return mappings[serviceType?.toLowerCase()] || 'establishment';
  }

  mapPriceRange(priceRange) {
    const mappings = {
      'budget': 1,
      'affordable': 1,
      'moderate': 2,
      'mid-range': 2,
      'expensive': 3,
      'upscale': 3,
      'luxury': 4,
      'fine-dining': 4
    };
    
    return mappings[priceRange?.toLowerCase()] || 2;
  }

  filterRestaurantsByPreferences(restaurants, preferences) {
    return restaurants.filter(restaurant => {
      // Price level filter
      if (preferences.priceRange && preferences.priceRange !== 'any') {
        const prefPrice = this.mapPriceRange(preferences.priceRange);
        const restaurantPrice = restaurant.priceLevel || 2;
        if (Math.abs(restaurantPrice - prefPrice) > 1) {
          return false;
        }
      }
      
      // Cuisine type filter (basic keyword matching)
      if (preferences.cuisineType && preferences.cuisineType !== 'any') {
        const cuisine = preferences.cuisineType.toLowerCase();
        const restaurantTypes = (restaurant.types || []).join(' ').toLowerCase();
        const restaurantName = restaurant.name.toLowerCase();
        
        if (!restaurantTypes.includes(cuisine) && !restaurantName.includes(cuisine)) {
          return false;
        }
      }
      
      return true;
    });
  }

  getDefaultAppointmentTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 10:00 AM tomorrow
    return tomorrow.toISOString();
  }

  getDefaultReservationTime() {
    const today = new Date();
    today.setHours(19, 0, 0, 0); // 7:00 PM today
    return today.toISOString();
  }

  generateErrorSuggestions(state) {
    const suggestions = [];
    
    if (state.error.includes('not available')) {
      suggestions.push('Try again in a few moments');
      suggestions.push('Check your internet connection');
    }
    
    if (state.error.includes('search failed') || state.error.includes('No suitable')) {
      suggestions.push('Try a different location or expand your search area');
      suggestions.push('Be more specific about the type of service you need');
      suggestions.push('Try different search terms or preferences');
    }
    
    if (state.error.includes('booking failed') || state.error.includes('reservation failed')) {
      suggestions.push('Try calling the business directly');
      suggestions.push('Consider alternative time slots');
      suggestions.push('Look for similar businesses in your area');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Please provide more specific details about what you need');
      suggestions.push('Try rephrasing your request');
    }
    
    return suggestions;
  }

  // Public methods for workflow management
  async executeWorkflow(workflowType, initialState) {
    try {
      const workflowId = initialState.workflowId || `wf_${uuidv4()}`;
      
      logger.info(`Executing ${workflowType} workflow: ${workflowId}`);

      // Store workflow state
      this.workflows.set(workflowId, {
        type: workflowType,
        status: 'running',
        createdAt: new Date(),
        state: initialState
      });

      let workflow;
      switch (workflowType) {
        case 'appointment_booking':
          workflow = this.createAppointmentBookingWorkflow();
          break;
        case 'restaurant_reservation':
          workflow = this.createRestaurantReservationWorkflow();
          break;
        default:
          throw new Error(`Unknown workflow type: ${workflowType}`);
      }

      // Add workflow metadata to state
      const enhancedState = {
        ...initialState,
        workflowId,
        startTime: new Date()
      };

      // Execute workflow
      const result = await workflow.invoke(enhancedState);

      // Update workflow status
      this.workflows.set(workflowId, {
        ...this.workflows.get(workflowId),
        status: result.error ? 'failed' : 'completed',
        completedAt: new Date(),
        result: result
      });

      logger.info(`Workflow ${workflowType} completed:`, {
        workflowId,
        success: !result.error,
        finalStep: result.currentStep
      });

      return {
        success: !result.error,
        workflowId,
        result: result,
        workflowType,
        executionTime: Date.now() - enhancedState.startTime.getTime()
      };

    } catch (error) {
      logger.error(`Workflow execution failed for ${workflowType}:`, error);
      
      // Update workflow status
      if (initialState.workflowId) {
        this.workflows.set(initialState.workflowId, {
          ...this.workflows.get(initialState.workflowId),
          status: 'failed',
          error: error.message,
          completedAt: new Date()
        });
      }
      
      throw error;
    }
  }

  getWorkflowStatus(workflowId) {
    return this.workflows.get(workflowId) || null;
  }

  cancelWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.status = 'cancelled';
      workflow.cancelledAt = new Date();
      this.workflows.set(workflowId, workflow);
      return true;
    }
    return false;
  }

  listActiveWorkflows() {
    return Array.from(this.workflows.entries())
      .filter(([id, workflow]) => workflow.status === 'running')
      .map(([id, workflow]) => ({
        id,
        type: workflow.type,
        status: workflow.status,
        createdAt: workflow.createdAt
      }));
  }
}

export default new LangGraphService();