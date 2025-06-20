import BaseAgent from './BaseAgent.js';
import { AGENT_TYPES } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import axios from 'axios';
import { REDIS_CHANNELS } from '../config/constants.js';

export class OmniDimensionAgent extends BaseAgent {
  constructor() {
    const capabilities = [
      'voice_calling',
      'appointment_booking',
      'restaurant_reservations',
      'phone_automation',
      'calendar_integration',
      'confirmation_calls',
      'follow_up_calls',
      'call_analytics'
    ];

    const systemPrompt = `
You are the OmniDimension Agent, specialized in voice automation and phone-based interactions.

Your primary responsibilities:
1. Make automated voice calls for appointment booking
2. Handle restaurant reservation calls
3. Conduct confirmation and follow-up calls
4. Process call responses and extract booking information
5. Integrate with calendar systems for scheduling
6. Analyze call success rates and outcomes
7. Handle multi-step phone conversations

Call Types you handle:
- appointment_booking: Medical, dental, beauty, professional services
- restaurant_reservation: Table reservations, party bookings
- confirmation_calls: Verify existing bookings
- cancellation_calls: Cancel or modify bookings
- information_calls: Gather business information
- follow_up_calls: Post-service feedback

When making calls:
1. Use natural, professional conversation flow
2. Gather all required information (name, phone, email, preferences)
3. Confirm details before finalizing bookings
4. Handle objections and alternative options
5. Provide clear confirmation details
6. Schedule appropriate follow-up actions

Call Analytics:
- Track success rates and failure reasons
- Analyze conversation quality and duration
- Monitor customer satisfaction indicators
- Optimize calling strategies based on outcomes

Always maintain:
- Professional and friendly tone
- Accurate information handling
- Privacy and confidentiality
- Clear communication of booking details
- Proper error handling and fallbacks

Integrate seamlessly with calendar systems and provide structured results.
    `;

    super(AGENT_TYPES.OMNIDIMENSION, capabilities, systemPrompt);
    
    this.callQueue = new Map();
    this.activeCallSessions = new Map();
    this.callHistory = new Map();
    this.apiConfig = {
      baseUrl: process.env.OMNIDIMENSION_API_URL || 'https://api.omnidimension.com/v1',
      apiKey: process.env.OMNIDIMENSION_API_KEY,
      timeout: 60000
    };
  }

  async executeTask(taskId, taskData) {
    logger.info(`OmniDimension Agent executing task: ${taskId}`, taskData);

    try {
      switch (taskData.action) {
        case 'make_appointment_calls':
          return await this.makeAppointmentCalls(taskData);
        case 'make_reservation_calls':
          return await this.makeReservationCalls(taskData);
        case 'single_booking_call':
          return await this.makeSingleBookingCall(taskData);
        case 'confirmation_call':
          return await this.makeConfirmationCall(taskData);
        case 'cancellation_call':
          return await this.makeCancellationCall(taskData);
        case 'information_call':
          return await this.makeInformationCall(taskData);
        case 'analyze_call_outcomes':
          return await this.analyzeCallOutcomes(taskData);
        default:
          return await super.executeTask(taskId, taskData);
      }
    } catch (error) {
      logger.error(`OmniDimension Agent task execution failed:`, error);
      throw error;
    }
  }

  async makeAppointmentCalls(taskData) {
    const { 
      providers = [], 
      appointment_type, 
      preferred_time, 
      user_info = {},
      preferences = {},
      maxProviders = 3
    } = taskData.parameters || taskData;

    logger.info('Making appointment calls:', { 
      providerCount: providers.length, 
      appointmentType: appointment_type,
      preferredTime: preferred_time 
    });

    if (!this.apiConfig.apiKey) {
      throw new Error('OmniDimension API key not configured');
    }

    const callResults = [];
    const sortedProviders = this.prioritizeProviders(providers, preferences);
    const providersToCall = sortedProviders.slice(0, maxProviders);

    logger.info(`Calling ${providersToCall.length} providers for appointments`);

    for (const provider of providersToCall) {
      try {
        const callResult = await this.makeProviderCall(provider, {
          type: 'appointment_booking',
          appointment_type,
          preferred_time,
          user_info,
          preferences
        });

        callResults.push({
          provider: provider,
          callResult: callResult,
          success: callResult.booking_confirmed,
          timestamp: new Date().toISOString()
        });

        // If successful booking, stop calling other providers
        if (callResult.booking_confirmed) {
          logger.info(`Appointment successfully booked with ${provider.name}`);
          
          // Create calendar event
          const calendarEvent = await this.createCalendarEvent({
            title: `${appointment_type} appointment at ${provider.name}`,
            description: `Appointment booked via OmniDimension`,
            startTime: callResult.appointment_details?.date_time,
            location: provider.address,
            attendees: [user_info.email],
            metadata: {
              provider: provider,
              booking_reference: callResult.booking_reference,
              phone: provider.phone
            }
          });

          return {
            success: true,
            result: {
              booking_confirmed: true,
              provider: provider,
              appointment_details: callResult.appointment_details,
              booking_reference: callResult.booking_reference,
              calendar_event: calendarEvent,
              confirmation_method: callResult.confirmation_method,
              call_summary: callResult.call_summary,
              providers_called: callResults.length,
              total_call_duration: callResults.reduce((sum, r) => sum + (r.callResult.duration || 0), 0)
            },
            metadata: {
              processingTime: Date.now(),
              providersContacted: callResults.length,
              successfulBooking: true
            }
          };
        }

        // Add delay between calls to be respectful
        await this.delay(2000);

      } catch (error) {
        logger.error(`Error calling provider ${provider.name}:`, error);
        callResults.push({
          provider: provider,
          callResult: { 
            error: error.message,
            booking_confirmed: false
          },
          success: false,
          timestamp: new Date().toISOString()
        });
      }
    }

    // No successful bookings
    return {
      success: false,
      result: {
        booking_confirmed: false,
        message: 'Unable to secure appointment with any provider',
        providers_attempted: callResults,
        suggestions: this.generateBookingSuggestions(callResults, appointment_type),
        alternative_actions: [
          'Try different time slots',
          'Expand search radius',
          'Consider different service providers',
          'Manual booking recommended'
        ]
      },
      metadata: {
        processingTime: Date.now(),
        providersContacted: callResults.length,
        successfulBooking: false
      }
    };
  }

  async makeReservationCalls(taskData) {
    const { 
      restaurants = [], 
      reservation_time, 
      party_size = 2,
      user_info = {},
      preferences = {},
      maxRestaurants = 3
    } = taskData.parameters || taskData;

    logger.info('Making restaurant reservation calls:', { 
      restaurantCount: restaurants.length,
      reservationTime: reservation_time,
      partySize: party_size
    });

    const callResults = [];
    const sortedRestaurants = this.prioritizeRestaurants(restaurants, preferences);
    const restaurantsToCall = sortedRestaurants.slice(0, maxRestaurants);

    for (const restaurant of restaurantsToCall) {
      try {
        const callResult = await this.makeProviderCall(restaurant, {
          type: 'restaurant_reservation',
          reservation_time,
          party_size,
          user_info,
          preferences,
          special_requests: preferences.special_requests
        });

        callResults.push({
          restaurant: restaurant,
          callResult: callResult,
          success: callResult.reservation_confirmed,
          timestamp: new Date().toISOString()
        });

        if (callResult.reservation_confirmed) {
          logger.info(`Reservation successfully made at ${restaurant.name}`);

          // Create calendar event for reservation
          const calendarEvent = await this.createCalendarEvent({
            title: `Dinner at ${restaurant.name}`,
            description: `Restaurant reservation for ${party_size} people`,
            startTime: callResult.reservation_details?.date_time,
            location: restaurant.address,
            attendees: [user_info.email],
            metadata: {
              restaurant: restaurant,
              reservation_reference: callResult.reservation_reference,
              party_size: party_size,
              phone: restaurant.phone
            }
          });

          return {
            success: true,
            result: {
              reservation_confirmed: true,
              restaurant: restaurant,
              reservation_details: callResult.reservation_details,
              reservation_reference: callResult.reservation_reference,
              calendar_event: calendarEvent,
              special_notes: callResult.special_notes,
              call_summary: callResult.call_summary,
              restaurants_called: callResults.length
            },
            metadata: {
              processingTime: Date.now(),
              restaurantsContacted: callResults.length,
              successfulReservation: true
            }
          };
        }

        await this.delay(2000);

      } catch (error) {
        logger.error(`Error calling restaurant ${restaurant.name}:`, error);
        callResults.push({
          restaurant: restaurant,
          callResult: { 
            error: error.message,
            reservation_confirmed: false
          },
          success: false,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      success: false,
      result: {
        reservation_confirmed: false,
        message: 'Unable to secure reservation at any restaurant',
        restaurants_attempted: callResults,
        suggestions: this.generateReservationSuggestions(callResults, reservation_time, party_size),
        alternative_actions: [
          'Try different time slots',
          'Consider smaller party size',
          'Look for restaurants with online booking',
          'Try calling during off-peak hours'
        ]
      },
      metadata: {
        processingTime: Date.now(),
        restaurantsContacted: callResults.length,
        successfulReservation: false
      }
    };
  }

  async makeSingleBookingCall(taskData) {
    const { 
      provider, 
      booking_type, 
      booking_details, 
      user_info 
    } = taskData.parameters || taskData;

    logger.info('Making single booking call:', { 
      provider: provider.name, 
      bookingType: booking_type 
    });

    try {
      const callResult = await this.makeProviderCall(provider, {
        type: booking_type,
        ...booking_details,
        user_info
      });

      if (callResult.booking_confirmed || callResult.reservation_confirmed) {
        const calendarEvent = await this.createCalendarEvent({
          title: `${booking_type} at ${provider.name}`,
          description: `Booking made via OmniDimension`,
          startTime: callResult.booking_details?.date_time || callResult.reservation_details?.date_time,
          location: provider.address,
          attendees: [user_info.email],
          metadata: {
            provider: provider,
            booking_reference: callResult.booking_reference || callResult.reservation_reference
          }
        });

        return {
          success: true,
          result: {
            booking_confirmed: true,
            provider: provider,
            booking_details: callResult.booking_details || callResult.reservation_details,
            reference: callResult.booking_reference || callResult.reservation_reference,
            calendar_event: calendarEvent,
            call_summary: callResult.call_summary
          }
        };
      } else {
        return {
          success: false,
          result: {
            booking_confirmed: false,
            provider: provider,
            reason: callResult.reason || 'Booking not available',
            alternative_suggestions: callResult.alternatives || [],
            call_summary: callResult.call_summary
          }
        };
      }

    } catch (error) {
      logger.error('Single booking call failed:', error);
      throw error;
    }
  }

  async makeConfirmationCall(taskData) {
    const { 
      provider, 
      booking_reference, 
      booking_details, 
      confirmation_type = 'appointment'
    } = taskData.parameters || taskData;

    logger.info('Making confirmation call:', { 
      provider: provider.name, 
      reference: booking_reference 
    });

    try {
      const callResult = await this.makeProviderCall(provider, {
        type: 'confirmation_call',
        booking_reference,
        booking_details,
        confirmation_type
      });

      return {
        success: true,
        result: {
          confirmation_status: callResult.confirmed,
          provider: provider,
          booking_reference: booking_reference,
          confirmed_details: callResult.confirmed_details,
          changes_made: callResult.changes_made || [],
          next_steps: callResult.next_steps || [],
          call_summary: callResult.call_summary
        },
        metadata: {
          processingTime: Date.now(),
          confirmationSuccessful: callResult.confirmed
        }
      };

    } catch (error) {
      logger.error('Confirmation call failed:', error);
      throw error;
    }
  }

  async makeCancellationCall(taskData) {
    const { 
      provider, 
      booking_reference, 
      cancellation_reason,
      reschedule_request = false
    } = taskData.parameters || taskData;

    logger.info('Making cancellation call:', { 
      provider: provider.name, 
      reference: booking_reference 
    });

    try {
      const callResult = await this.makeProviderCall(provider, {
        type: 'cancellation_call',
        booking_reference,
        cancellation_reason,
        reschedule_request
      });

      return {
        success: true,
        result: {
          cancellation_confirmed: callResult.cancelled,
          provider: provider,
          booking_reference: booking_reference,
          cancellation_policy: callResult.cancellation_policy,
          refund_information: callResult.refund_info,
          reschedule_options: callResult.reschedule_options || [],
          call_summary: callResult.call_summary
        },
        metadata: {
          processingTime: Date.now(),
          cancellationSuccessful: callResult.cancelled
        }
      };

    } catch (error) {
      logger.error('Cancellation call failed:', error);
      throw error;
    }
  }

  async makeInformationCall(taskData) {
    const { 
      provider, 
      information_type, 
      specific_questions = []
    } = taskData.parameters || taskData;

    logger.info('Making information call:', { 
      provider: provider.name, 
      infoType: information_type 
    });

    try {
      const callResult = await this.makeProviderCall(provider, {
        type: 'information_call',
        information_type,
        questions: specific_questions
      });

      return {
        success: true,
        result: {
          information_gathered: callResult.information,
          provider: provider,
          questions_answered: callResult.answered_questions || [],
          additional_info: callResult.additional_info || {},
          follow_up_needed: callResult.follow_up_needed || false,
          call_summary: callResult.call_summary
        },
        metadata: {
          processingTime: Date.now(),
          informationComplete: !!callResult.information
        }
      };

    } catch (error) {
      logger.error('Information call failed:', error);
      throw error;
    }
  }

  async makeProviderCall(provider, callParameters) {
    const sessionId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`Starting call session ${sessionId} with ${provider.name}`);

    // Store active call session
    this.activeCallSessions.set(sessionId, {
      provider,
      callParameters,
      startTime: new Date(),
      status: 'initiating'
    });

    try {
      // Prepare call payload
      const callPayload = {
        session_id: sessionId,
        provider: {
          name: provider.name,
          phone: provider.phone,
          address: provider.address,
          business_type: provider.businessCategory || 'general'
        },
        call_type: callParameters.type,
        user_information: callParameters.user_info,
        booking_details: this.prepareBookingDetails(callParameters),
        conversation_context: this.buildConversationContext(callParameters),
        call_configuration: {
          max_duration: 300, // 5 minutes
          retry_on_busy: true,
          voice_settings: {
            voice: 'professional_female',
            speaking_rate: 'normal',
            tone: 'friendly_professional'
          }
        }
      };

      // Make API call to OmniDimension
      const response = await axios.post(
        `${this.apiConfig.baseUrl}/calls/initiate`,
        callPayload,
        {
          headers: {
            'Authorization': `Bearer ${this.apiConfig.apiKey}`,
            'Content-Type': 'application/json',
            'X-Agent-ID': this.id
          },
          timeout: this.apiConfig.timeout
        }
      );

      if (response.status !== 200) {
        throw new Error(`OmniDimension API error: ${response.status}`);
      }

      const callResult = response.data;
      
      // Update call session
      this.activeCallSessions.set(sessionId, {
        ...this.activeCallSessions.get(sessionId),
        status: 'completed',
        endTime: new Date(),
        result: callResult
      });

      // Store in call history
      this.callHistory.set(sessionId, {
        provider,
        callParameters,
        result: callResult,
        timestamp: new Date(),
        duration: callResult.call_duration || 0
      });

      logger.info(`Call session ${sessionId} completed successfully`);

      // Process and return structured result
      return this.processCallResult(callResult, callParameters.type);

    } catch (error) {
      logger.error(`Call session ${sessionId} failed:`, error);
      
      // Update call session with error
      this.activeCallSessions.set(sessionId, {
        ...this.activeCallSessions.get(sessionId),
        status: 'failed',
        endTime: new Date(),
        error: error.message
      });

      // For API errors, provide meaningful fallback
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 402) {
        throw new Error('Insufficient credits for voice calling.');
      } else {
        throw new Error(`Call failed: ${error.message}`);
      }
    } finally {
      // Clean up active session after delay
      setTimeout(() => {
        this.activeCallSessions.delete(sessionId);
      }, 300000); // 5 minutes
    }
  }

  prepareBookingDetails(callParameters) {
    const details = {};

    switch (callParameters.type) {
      case 'appointment_booking':
        details.appointment_type = callParameters.appointment_type;
        details.preferred_time = callParameters.preferred_time;
        details.duration_needed = callParameters.duration || '30 minutes';
        details.special_requirements = callParameters.preferences?.special_requirements;
        break;

      case 'restaurant_reservation':
        details.reservation_time = callParameters.reservation_time;
        details.party_size = callParameters.party_size;
        details.seating_preference = callParameters.preferences?.seating;
        details.dietary_restrictions = callParameters.preferences?.dietary_restrictions;
        details.special_occasion = callParameters.preferences?.special_occasion;
        break;

      case 'confirmation_call':
        details.booking_reference = callParameters.booking_reference;
        details.original_booking = callParameters.booking_details;
        break;

      case 'cancellation_call':
        details.booking_reference = callParameters.booking_reference;
        details.reason = callParameters.cancellation_reason;
        details.reschedule_request = callParameters.reschedule_request;
        break;

      case 'information_call':
        details.information_type = callParameters.information_type;
        details.specific_questions = callParameters.questions;
        break;
    }

    return details;
  }

  buildConversationContext(callParameters) {
    return {
      greeting: `Hello, I'm calling on behalf of ${callParameters.user_info?.name || 'a customer'}`,
      purpose: this.getCallPurposeStatement(callParameters.type),
      fallback_responses: this.getFallbackResponses(callParameters.type),
      closing_statements: this.getClosingStatements(callParameters.type),
      escalation_triggers: [
        'speak to manager',
        'not available',
        'call back later',
        'book online'
      ]
    };
  }

  getCallPurposeStatement(callType) {
    switch (callType) {
      case 'appointment_booking':
        return 'I would like to schedule an appointment for my client';
      case 'restaurant_reservation':
        return 'I would like to make a dinner reservation';
      case 'confirmation_call':
        return 'I am calling to confirm an existing booking';
      case 'cancellation_call':
        return 'I need to cancel or modify an existing booking';
      case 'information_call':
        return 'I am calling to get some information about your services';
      default:
        return 'I am calling to assist with a booking request';
    }
  }

  getFallbackResponses(callType) {
    return {
      busy_line: 'I understand you are busy. When would be a better time to call?',
      not_available: 'Could you please suggest alternative times or dates?',
      need_more_info: 'I can provide any additional information you need',
      callback_request: 'I can provide a callback number if that works better'
    };
  }

  getClosingStatements(callType) {
    return {
      success: 'Thank you for your time. We look forward to the appointment.',
      partial_success: 'Thank you. I will follow up with the additional information.',
      no_success: 'Thank you for your time. We will explore other options.'
    };
  }

  processCallResult(callResult, callType) {
    const processed = {
      call_duration: callResult.duration || 0,
      call_status: callResult.status || 'unknown',
      conversation_transcript: callResult.transcript || '',
      call_summary: callResult.summary || 'Call completed',
      outcome_confidence: callResult.confidence || 0.7
    };

    switch (callType) {
      case 'appointment_booking':
        processed.booking_confirmed = callResult.booking_success || false;
        processed.appointment_details = callResult.appointment_info || {};
        processed.booking_reference = callResult.reference_number || null;
        processed.confirmation_method = callResult.confirmation_type || 'phone';
        processed.alternatives = callResult.alternative_times || [];
        break;

      case 'restaurant_reservation':
        processed.reservation_confirmed = callResult.reservation_success || false;
        processed.reservation_details = callResult.reservation_info || {};
        processed.reservation_reference = callResult.reference_number || null;
        processed.special_notes = callResult.special_instructions || '';
        processed.alternatives = callResult.alternative_times || [];
        break;

      case 'confirmation_call':
        processed.confirmed = callResult.confirmation_status || false;
        processed.confirmed_details = callResult.booking_details || {};
        processed.changes_made = callResult.modifications || [];
        processed.next_steps = callResult.follow_up_actions || [];
        break;

      case 'cancellation_call':
        processed.cancelled = callResult.cancellation_success || false;
        processed.cancellation_policy = callResult.policy_info || '';
        processed.refund_info = callResult.refund_details || {};
        processed.reschedule_options = callResult.reschedule_offers || [];
        break;

      case 'information_call':
        processed.information = callResult.gathered_info || {};
        processed.answered_questions = callResult.question_responses || [];
        processed.additional_info = callResult.extra_details || {};
        processed.follow_up_needed = callResult.requires_followup || false;
        break;
    }

    return processed;
  }

  async createCalendarEvent(eventData) {
    try {
      // Use CalendarTool for event creation
      const calendarTool = this.tools.find(tool => tool.name === 'calendar_integration');
      
      const calendarInput = JSON.stringify({
        action: 'create_event',
        eventData: {
          title: eventData.title,
          description: eventData.description,
          startTime: eventData.startTime,
          endTime: eventData.endTime || this.calculateEndTime(eventData.startTime, 60), // Default 1 hour
          location: eventData.location,
          attendees: eventData.attendees || [],
          metadata: eventData.metadata || {}
        }
      });

      const result = await calendarTool._call(calendarInput);
      const parsedResult = JSON.parse(result);

      if (parsedResult.success) {
        return parsedResult.result;
      } else {
        logger.warn('Calendar event creation failed:', parsedResult.error);
        return null;
      }

    } catch (error) {
      logger.error('Calendar integration error:', error);
      return null;
    }
  }

  calculateEndTime(startTime, durationMinutes) {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + (durationMinutes * 60 * 1000));
    return end.toISOString();
  }

  prioritizeProviders(providers, preferences) {
    return providers.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Rating priority
      scoreA += (a.rating || 0) * 30;
      scoreB += (b.rating || 0) * 30;

      // Review count priority
      scoreA += Math.min((a.userRatingsTotal || 0) / 10, 20);
      scoreB += Math.min((b.userRatingsTotal || 0) / 10, 20);

      // Open now bonus
      if (a.openNow) scoreA += 25;
      if (b.openNow) scoreB += 25;

      // Phone availability bonus
      if (a.phone) scoreA += 15;
      if (b.phone) scoreB += 15;

      // Distance consideration
      if (a.distance && b.distance) {
        scoreA += Math.max(0, (10 - a.distance) * 2);
        scoreB += Math.max(0, (10 - b.distance) * 2);
      }

      return scoreB - scoreA;
    });
  }

  prioritizeRestaurants(restaurants, preferences) {
    return restaurants.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Rating priority (higher weight for restaurants)
      scoreA += (a.rating || 0) * 35;
      scoreB += (b.rating || 0) * 35;

      // Price level preference
      if (preferences.priceLevel) {
        const prefPrice = preferences.priceLevel;
        scoreA += Math.max(0, 20 - Math.abs((a.priceLevel || 2) - prefPrice) * 5);
        scoreB += Math.max(0, 20 - Math.abs((b.priceLevel || 2) - prefPrice) * 5);
      }

      // Open now priority for restaurants
      if (a.openNow) scoreA += 30;
      if (b.openNow) scoreB += 30;

      // Phone availability
      if (a.phone) scoreA += 10;
      if (b.phone) scoreB += 10;

      return scoreB - scoreA;
    });
  }

  generateBookingSuggestions(callResults, appointmentType) {
    const suggestions = [];
    
    const busyProviders = callResults.filter(r => 
      r.callResult.reason?.includes('busy') || r.callResult.reason?.includes('booked')
    );
    
    if (busyProviders.length > 0) {
      suggestions.push('Try booking for a different time or date');
      suggestions.push('Consider early morning or late afternoon appointments');
    }

    const closedProviders = callResults.filter(r => 
      r.callResult.reason?.includes('closed') || r.callResult.reason?.includes('hours')
    );
    
    if (closedProviders.length > 0) {
      suggestions.push('Call during business hours for better availability');
    }

    suggestions.push(`Look for additional ${appointmentType} providers in the area`);
    suggestions.push('Consider online booking platforms as an alternative');

    return suggestions;
  }

  generateReservationSuggestions(callResults, reservationTime, partySize) {
    const suggestions = [];
    
    if (partySize > 6) {
      suggestions.push('Consider splitting into smaller groups');
      suggestions.push('Look for restaurants that specialize in large parties');
    }

    const timeIssues = callResults.filter(r => 
      r.callResult.reason?.includes('time') || r.callResult.reason?.includes('full')
    );
    
    if (timeIssues.length > 0) {
      suggestions.push('Try earlier or later dining times');
      suggestions.push('Consider lunch reservations which may have better availability');
    }

    suggestions.push('Check online reservation platforms');
    suggestions.push('Consider restaurants with walk-in policies');

    return suggestions;
  }

  async analyzeCallOutcomes(taskData) {
    const { timeRange = '7d', callType = 'all' } = taskData.parameters || taskData;

    logger.info('Analyzing call outcomes:', { timeRange, callType });

    const cutoffDate = new Date();
    switch (timeRange) {
      case '1d':
        cutoffDate.setDate(cutoffDate.getDate() - 1);
        break;
      case '7d':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case '30d':
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        break;
    }

    const relevantCalls = Array.from(this.callHistory.values())
      .filter(call => call.timestamp >= cutoffDate)
      .filter(call => callType === 'all' || call.callParameters.type === callType);

    const analysis = {
      total_calls: relevantCalls.length,
      success_rate: 0,
      average_duration: 0,
      call_type_breakdown: {},
      success_factors: [],
      failure_reasons: [],
      recommendations: []
    };

    if (relevantCalls.length === 0) {
      return {
        success: true,
        result: {
          ...analysis,
          message: 'No calls found in the specified time range'
        }
      };
    }

    // Calculate success rate
    const successfulCalls = relevantCalls.filter(call => 
      call.result.booking_confirmed || 
      call.result.reservation_confirmed || 
      call.result.confirmed
    );
    
    analysis.success_rate = (successfulCalls.length / relevantCalls.length) * 100;

    // Calculate average duration
    const totalDuration = relevantCalls.reduce((sum, call) => sum + (call.result.call_duration || 0), 0);
    analysis.average_duration = totalDuration / relevantCalls.length;

    // Call type breakdown
    const typeBreakdown = {};
    relevantCalls.forEach(call => {
      const type = call.callParameters.type;
      if (!typeBreakdown[type]) {
        typeBreakdown[type] = { total: 0, successful: 0 };
      }
      typeBreakdown[type].total++;
      if (call.result.booking_confirmed || call.result.reservation_confirmed || call.result.confirmed) {
        typeBreakdown[type].successful++;
      }
    });

    Object.keys(typeBreakdown).forEach(type => {
      analysis.call_type_breakdown[type] = {
        ...typeBreakdown[type],
        success_rate: (typeBreakdown[type].successful / typeBreakdown[type].total) * 100
      };
    });

    // Identify success factors and failure reasons
    analysis.success_factors = this.identifySuccessFactors(successfulCalls);
    analysis.failure_reasons = this.identifyFailureReasons(relevantCalls.filter(call => !successfulCalls.includes(call)));

    // Generate recommendations
    analysis.recommendations = this.generateOptimizationRecommendations(analysis);

    return {
      success: true,
      result: analysis,
      metadata: {
        processingTime: Date.now(),
        timeRange,
        callType,
        analyzedCalls: relevantCalls.length
      }
    };
  }

  identifySuccessFactors(successfulCalls) {
    const factors = [];
    
    if (successfulCalls.length === 0) return factors;

    const avgDuration = successfulCalls.reduce((sum, call) => sum + (call.result.call_duration || 0), 0) / successfulCalls.length;
    
    if (avgDuration < 180) { // Less than 3 minutes
      factors.push('Quick call resolution leads to higher success rates');
    }

    const openNowCalls = successfulCalls.filter(call => call.provider?.openNow);
    if (openNowCalls.length / successfulCalls.length > 0.7) {
      factors.push('Calling businesses during open hours significantly improves success');
    }

    const highRatedProviders = successfulCalls.filter(call => (call.provider?.rating || 0) >= 4.0);
    if (highRatedProviders.length / successfulCalls.length > 0.6) {
      factors.push('Higher-rated businesses are more likely to accept bookings');
    }

    return factors;
  }

  identifyFailureReasons(failedCalls) {
    const reasons = [];
    
    if (failedCalls.length === 0) return reasons;

    const busyReasons = failedCalls.filter(call => 
      call.result.reason?.toLowerCase().includes('busy') || 
      call.result.reason?.toLowerCase().includes('booked')
    );
    
    if (busyReasons.length / failedCalls.length > 0.3) {
      reasons.push('High demand periods - many businesses are fully booked');
    }

    const closedReasons = failedCalls.filter(call => 
      call.result.reason?.toLowerCase().includes('closed') || 
      call.result.reason?.toLowerCase().includes('hours')
    );
    
    if (closedReasons.length / failedCalls.length > 0.2) {
      reasons.push('Calling outside business hours reduces success rates');
    }

    const noPhoneReasons = failedCalls.filter(call => !call.provider?.phone);
    if (noPhoneReasons.length / failedCalls.length > 0.1) {
      reasons.push('Missing or invalid phone numbers prevent successful calls');
    }

    return reasons;
  }

  generateOptimizationRecommendations(analysis) {
    const recommendations = [];

    if (analysis.success_rate < 50) {
      recommendations.push({
        priority: 'high',
        category: 'success_rate',
        suggestion: 'Improve provider selection criteria to focus on businesses with phone availability and good ratings'
      });
    }

    if (analysis.average_duration > 300) { // More than 5 minutes
      recommendations.push({
        priority: 'medium',
        category: 'efficiency',
        suggestion: 'Optimize conversation flow to reduce call duration and improve efficiency'
      });
    }

    recommendations.push({
      priority: 'low',
      category: 'timing',
      suggestion: 'Schedule calls during peak business hours for better response rates'
    });

    if (Object.keys(analysis.call_type_breakdown).some(type => 
      analysis.call_type_breakdown[type].success_rate < 30
    )) {
      recommendations.push({
        priority: 'medium',
        category: 'call_strategy',
        suggestion: 'Review and optimize scripts for underperforming call types'
      });
    }

    return recommendations;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup method
  async cleanup() {
    // Cancel any active calls
    for (const [sessionId, session] of this.activeCallSessions) {
      if (session.status === 'active') {
        logger.info(`Cleaning up active call session: ${sessionId}`);
        // In production, would cancel the actual call via API
      }
    }

    this.activeCallSessions.clear();
    
    // Keep recent call history but limit size
    const historyArray = Array.from(this.callHistory.entries());
    if (historyArray.length > 1000) {
      const recentHistory = historyArray
        .sort(([,a], [,b]) => b.timestamp - a.timestamp)
        .slice(0, 500);
      
      this.callHistory.clear();
      recentHistory.forEach(([id, call]) => {
        this.callHistory.set(id, call);
      });
    }
  }
}

export default OmniDimensionAgent;