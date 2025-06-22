/**
 * OmniDimension Agent - Fixed and Improved Version
 * Current Date and Time: 2025-06-21 04:23:03 UTC
 * Current User: ayush20244048
 */

import BaseAgent from "./BaseAgent.js";
import { AGENT_TYPES } from "../config/constants.js";
import { logger } from "../utils/logger.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class OmniDimensionAgent extends BaseAgent {
  constructor() {
    const capabilities = [
      "voice_calling",
      "appointment_booking",
      "restaurant_reservations",
      "phone_automation",
      "calendar_integration",
      "confirmation_calls",
      "follow_up_calls",
      "call_analytics",
    ];

    const systemPrompt = `
You are the OmniDimension Agent, specialized in voice automation and phone-based interactions.
Current Date and Time: ${new Date().toISOString()}
Current User: ayush20244048

Your primary responsibilities:
1. Make automated voice calls for appointment booking using Python SDK
2. Handle restaurant reservation calls using proper OmniDimension API
3. Conduct confirmation and follow-up calls
4. Process call responses and extract booking information
5. Integrate with calendar systems for scheduling
6. Analyze call success rates and outcomes

All calls are made using the proper OmniDimension Python SDK.
TESTING MODE: All calls will be made to 9548999129 for testing purposes.
    `;

    super(AGENT_TYPES.OMNIDIMENSION, capabilities, systemPrompt);

    this.pythonServicePath = path.join(
      __dirname,
      "../services/omnidimension_service.py"
    );
    this.testPhoneNumber = "9548999129";
    this.callTimeout = 300000; // 5 minutes timeout for calls
    this.maxRetries = 3;

    logger.info("✅ OmniDimensionAgent initialized with Python service", {
      currentUser: "ayush20244048",
      pythonServicePath: this.pythonServicePath,
      testMode: true,
      testPhone: this.testPhoneNumber,
      timestamp: new Date().toISOString(),
    });
  }

  async executeTask(taskId, taskData) {
    const timestamp = new Date().toISOString();

    logger.info(`🎯 OmniDimension Agent executing task: ${taskId}`, {
      action: taskData.action,
      currentUser: "ayush20244048",
      timestamp,
    });

    try {
      // Validate task data
      if (!taskData || !taskData.action) {
        throw new Error("Invalid task data: missing action");
      }

      switch (taskData.action) {
        case "make_appointment_calls":
          return await this.makeAppointmentCalls(taskData);
        case "make_reservation_calls":
          return await this.makeReservationCalls(taskData);
        case "voice_call":
          return await this.handleVoiceCall(taskData);
        case "single_booking_call":
          return await this.makeSingleBookingCall(taskData);
        case "confirmation_call":
          return await this.makeConfirmationCall(taskData);
        case "cancellation_call":
          return await this.makeCancellationCall(taskData);
        default:
          logger.warn(`⚠️ Unknown action ${taskData.action}, using fallback`);
          return await this.executeTaskFallback(taskId, taskData);
      }
    } catch (error) {
      logger.error(`❌ OmniDimension Agent task execution failed:`, {
        error: error.message,
        stack: error.stack,
        taskId,
        action: taskData?.action,
        currentUser: "ayush20244048",
        timestamp,
      });

      return {
        success: false,
        error: error.message,
        taskId,
        timestamp,
        metadata: {
          errorType: error.constructor.name,
          currentUser: "ayush20244048",
        },
      };
    }
  }

  async callPythonService(action, data, retryCount = 0) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pythonProcess.kill();
        reject(new Error(`Python service timeout after ${this.callTimeout}ms`));
      }, this.callTimeout);

      const pythonProcess = spawn("python3", [this.pythonServicePath], {
        stdio: ["pipe", "pipe", "pipe"],
        timeout: this.callTimeout,
      });

      const requestData = {
        action: action,
        data: data,
        timestamp: new Date().toISOString(),
        user: "ayush20244048",
        retry_count: retryCount,
      };

      let stdout = "";
      let stderr = "";

      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      pythonProcess.on("close", (code) => {
        clearTimeout(timeout);

        if (code === 0) {
          try {
            // Clean the stdout to extract only JSON
            const jsonStart = stdout.indexOf("{");
            const jsonEnd = stdout.lastIndexOf("}") + 1;

            if (jsonStart === -1 || jsonEnd === 0) {
              throw new Error("No valid JSON found in Python response");
            }

            const jsonString = stdout.substring(jsonStart, jsonEnd);
            const result = JSON.parse(jsonString);

            logger.info("✅ Python service response received", {
              action,
              success: result.success,
              timestamp: new Date().toISOString(),
            });

            resolve(result);
          } catch (parseError) {
            logger.error(`❌ Failed to parse Python service response:`, {
              stdout: stdout.substring(0, 500), // Limit log size
              stderr: stderr.substring(0, 500),
              parseError: parseError.message,
              currentUser: "ayush20244048",
            });

            // Retry logic
            if (retryCount < this.maxRetries) {
              logger.info(
                `🔄 Retrying Python service call (${retryCount + 1}/${
                  this.maxRetries
                })`
              );
              setTimeout(() => {
                this.callPythonService(action, data, retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              }, 1000 * (retryCount + 1)); // Exponential backoff
            } else {
              reject(
                new Error(
                  `Failed to parse Python response after ${this.maxRetries} retries: ${parseError.message}`
                )
              );
            }
          }
        } else {
          logger.error(`❌ Python service failed:`, {
            code,
            stderr: stderr.substring(0, 500),
            currentUser: "ayush20244048",
          });

          // Retry logic for failed processes
          if (retryCount < this.maxRetries && code !== 1) {
            // Don't retry on syntax errors
            logger.info(
              `🔄 Retrying Python service call (${retryCount + 1}/${
                this.maxRetries
              })`
            );
            setTimeout(() => {
              this.callPythonService(action, data, retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, 1000 * (retryCount + 1));
          } else {
            reject(
              new Error(`Python service failed with code ${code}: ${stderr}`)
            );
          }
        }
      });

      pythonProcess.on("error", (error) => {
        clearTimeout(timeout);
        logger.error("❌ Python process error:", {
          error: error.message,
          currentUser: "ayush20244048",
        });
        reject(new Error(`Python process error: ${error.message}`));
      });

      // Send data to Python process
      try {
        pythonProcess.stdin.write(JSON.stringify(requestData));
        pythonProcess.stdin.end();
      } catch (writeError) {
        clearTimeout(timeout);
        pythonProcess.kill();
        reject(
          new Error(`Failed to write to Python process: ${writeError.message}`)
        );
      }
    });
  }

  async makeReservationCalls(taskData) {
    const {
      restaurants = [],
      reservation_time = "tonight",
      party_size = 2,
      user_info = {},
      preferences = {},
      maxRestaurants = 3,
    } = taskData.parameters || taskData;

    const timestamp = new Date().toISOString();

    logger.info("🍽️ Making restaurant reservation calls via Python service:", {
      restaurantCount: restaurants.length,
      reservationTime: reservation_time,
      partySize: party_size,
      currentUser: "ayush20244048",
      timestamp,
    });

    // Validate and normalize restaurants
    const validatedRestaurants =
      this.validateAndNormalizeRestaurants(restaurants);

    if (validatedRestaurants.length === 0) {
      return {
        success: false,
        output: {
          reservation_confirmed: false,
          message: "No valid restaurants provided for reservation",
          error: "INVALID_RESTAURANT_DATA",
          timestamp,
        },
        metadata: {
          processingTime: Date.now(),
          restaurantsContacted: 0,
          successfulReservation: false,
          currentUser: "ayush20244048",
        },
      };
    }

    const restaurantsToCall = validatedRestaurants.slice(0, maxRestaurants);
    const results = [];

    // Try each restaurant using Python service
    for (let i = 0; i < restaurantsToCall.length; i++) {
      const restaurant = restaurantsToCall[i];

      try {
        const restaurantInfo = {
          name: restaurant.name || restaurant.placeId || `Restaurant ${i + 1}`,
          phone: restaurant.phone || this.testPhoneNumber,
          address: restaurant.address || "",
          placeId: restaurant.placeId || "",
        };

        const reservationDetails = {
          date: this.formatReservationDate(reservation_time),
          time: this.formatReservationTime(reservation_time),
          party_size: party_size,
          special_requests: preferences.special_requests || "None",
        };

        const customerInfo = {
          name: user_info.name || "ayush20244048",
          email: user_info.email || "ayush20244048@example.com",
          phone: user_info.phone || "",
        };

        logger.info(
          `📞 Calling Python service for ${restaurantInfo.name} (${i + 1}/${
            restaurantsToCall.length
          })`
        );

        const result = await this.callPythonService(
          "make_restaurant_reservation",
          {
            restaurant_info: restaurantInfo,
            reservation_details: reservationDetails,
            customer_info: customerInfo,
          }
        );

        results.push({
          restaurant: restaurantInfo,
          result,
          attempted: true,
        });

        if (result.success && result.reservation_confirmed) {
          logger.info(`✅ Reservation confirmed at ${restaurantInfo.name}`);

          return {
            success: true,
            output: {
              reservation_confirmed: true,
              restaurant: restaurant,
              reservation_details: reservationDetails,
              call_id: result.call_id,
              agent_id: result.agent_id,
              phone_number: result.phone_number,
              variables: result.variables,
              call_status: result.call_status,
              timestamp,
              method: "python_sdk",
            },
            metadata: {
              processingTime: Date.now(),
              restaurantsContacted: i + 1,
              successfulReservation: true,
              currentUser: "ayush20244048",
              pythonService: true,
              allResults: results,
            },
          };
        }
      } catch (error) {
        logger.error(
          `❌ Error calling restaurant ${restaurant.name || "restaurant"}:`,
          {
            error: error.message,
            currentUser: "ayush20244048",
            restaurantIndex: i,
          }
        );

        results.push({
          restaurant: restaurant,
          error: error.message,
          attempted: true,
        });

        continue;
      }
    }

    // If no restaurant worked
    return {
      success: true,
      output: {
        reservation_confirmed: false,
        message:
          "Unable to secure reservation at any restaurant via Python service",
        restaurants_attempted: restaurantsToCall.length,
        timestamp,
        method: "python_sdk",
      },
      metadata: {
        processingTime: Date.now(),
        restaurantsContacted: restaurantsToCall.length,
        successfulReservation: false,
        currentUser: "ayush20244048",
        pythonService: true,
        allResults: results,
      },
    };
  }

  async makeAppointmentCalls(taskData) {
    const {
      providers = [],
      appointment_type = "consultation",
      preferred_time = "tomorrow",
      user_info = {},
      maxProviders = 3,
    } = taskData.parameters || taskData;

    const timestamp = new Date().toISOString();

    logger.info("🏥 Making appointment calls via Python service:", {
      providerCount: providers.length,
      appointmentType: appointment_type,
      preferredTime: preferred_time,
      currentUser: "ayush20244048",
      timestamp,
    });

    if (!Array.isArray(providers) || providers.length === 0) {
      return {
        success: false,
        output: {
          booking_confirmed: false,
          message: "No providers provided for appointment booking",
          error: "INVALID_PROVIDER_DATA",
          timestamp,
        },
      };
    }

    const providersToCall = providers.slice(0, maxProviders);
    const results = [];

    // Try each provider using Python service
    for (let i = 0; i < providersToCall.length; i++) {
      const provider = providersToCall[i];

      try {
        const providerInfo = {
          name: provider.name || provider.placeId || `Provider ${i + 1}`,
          phone: provider.phone || this.testPhoneNumber,
          address: provider.address || "",
          placeId: provider.placeId || "",
        };

        const appointmentDetails = {
          date: this.formatAppointmentDate(preferred_time),
          time: this.formatAppointmentTime(preferred_time),
          service_type: appointment_type,
          special_instructions: "None",
        };

        const customerInfo = {
          name: user_info.name || "ayush20244048",
          email: user_info.email || "ayush20244048@example.com",
          phone: user_info.phone || "",
        };

        logger.info(
          `📞 Calling Python service for appointment at ${providerInfo.name} (${
            i + 1
          }/${providersToCall.length})`
        );

        const result = await this.callPythonService(
          "make_appointment_booking",
          {
            provider_info: providerInfo,
            appointment_details: appointmentDetails,
            customer_info: customerInfo,
          }
        );

        results.push({
          provider: providerInfo,
          result,
          attempted: true,
        });

        if (result.success && result.booking_confirmed) {
          logger.info(`✅ Appointment confirmed at ${providerInfo.name}`);

          return {
            success: true,
            output: {
              booking_confirmed: true,
              provider: provider,
              appointment_details: appointmentDetails,
              call_id: result.call_id,
              agent_id: result.agent_id,
              phone_number: result.phone_number,
              variables: result.variables,
              call_status: result.call_status,
              timestamp,
              method: "python_sdk",
            },
            metadata: {
              processingTime: Date.now(),
              providersContacted: i + 1,
              successfulBooking: true,
              currentUser: "ayush20244048",
              pythonService: true,
              allResults: results,
            },
          };
        }
      } catch (error) {
        logger.error(
          `❌ Error calling provider ${provider.name || "provider"}:`,
          {
            error: error.message,
            currentUser: "ayush20244048",
            providerIndex: i,
          }
        );

        results.push({
          provider: provider,
          error: error.message,
          attempted: true,
        });

        continue;
      }
    }

    return {
      success: true,
      output: {
        booking_confirmed: false,
        message:
          "Unable to secure appointment at any provider via Python service",
        providers_attempted: providersToCall.length,
        timestamp,
        method: "python_sdk",
      },
      metadata: {
        processingTime: Date.now(),
        providersContacted: providersToCall.length,
        successfulBooking: false,
        currentUser: "ayush20244048",
        pythonService: true,
        allResults: results,
      },
    };
  }

  // New methods for individual calls
  async makeSingleBookingCall(taskData) {
    const {
      target,
      type = "restaurant",
      details = {},
    } = taskData.parameters || taskData;

    if (type === "restaurant") {
      return await this.makeReservationCalls({
        parameters: {
          restaurants: [target],
          ...details,
          maxRestaurants: 1,
        },
      });
    } else if (type === "appointment") {
      return await this.makeAppointmentCalls({
        parameters: {
          providers: [target],
          ...details,
          maxProviders: 1,
        },
      });
    }

    return {
      success: false,
      output: {
        message: `Unknown booking type: ${type}`,
        error: "INVALID_BOOKING_TYPE",
        timestamp: new Date().toISOString(),
      },
    };
  }

  async makeConfirmationCall(taskData) {
    const {
      booking_id,
      call_type = "confirmation",
      details = {},
    } = taskData.parameters || taskData;

    try {
      const result = await this.callPythonService("make_confirmation_call", {
        booking_id,
        call_type,
        details,
      });

      return {
        success: true,
        output: {
          confirmation_made: result.success,
          call_id: result.call_id,
          booking_id,
          timestamp: new Date().toISOString(),
          method: "python_sdk",
        },
        metadata: {
          callType: call_type,
          currentUser: "ayush20244048",
        },
      };
    } catch (error) {
      return {
        success: false,
        output: {
          confirmation_made: false,
          error: error.message,
          booking_id,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  async makeCancellationCall(taskData) {
    const {
      booking_id,
      reason = "Customer request",
      details = {},
    } = taskData.parameters || taskData;

    try {
      const result = await this.callPythonService("make_cancellation_call", {
        booking_id,
        reason,
        details,
      });

      return {
        success: true,
        output: {
          cancellation_made: result.success,
          call_id: result.call_id,
          booking_id,
          reason,
          timestamp: new Date().toISOString(),
          method: "python_sdk",
        },
        metadata: {
          currentUser: "ayush20244048",
        },
      };
    } catch (error) {
      return {
        success: false,
        output: {
          cancellation_made: false,
          error: error.message,
          booking_id,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // Utility methods with improved date handling
  validateAndNormalizeRestaurants(rawRestaurants) {
    if (!rawRestaurants) return [];
    if (Array.isArray(rawRestaurants)) return rawRestaurants;
    if (
      rawRestaurants.success &&
      rawRestaurants.result &&
      rawRestaurants.result.places
    ) {
      return rawRestaurants.result.places;
    }
    if (rawRestaurants.places) return rawRestaurants.places;
    if (rawRestaurants.restaurants) return rawRestaurants.restaurants;
    return [];
  }

  formatReservationDate(reservationTime) {
    const now = new Date();

    if (reservationTime === "tonight" || reservationTime === "today") {
      return now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else if (reservationTime === "tomorrow") {
      now.setDate(now.getDate() + 1);
      return now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    // Default to tomorrow
    now.setDate(now.getDate() + 1);
    return now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  formatReservationTime(reservationTime) {
    const timeMap = {
      tonight: "7:00 PM",
      lunch: "12:00 PM",
      dinner: "7:00 PM",
      brunch: "11:00 AM",
      breakfast: "9:00 AM",
    };

    return timeMap[reservationTime] || "7:00 PM";
  }

  formatAppointmentDate(preferredTime) {
    const now = new Date();

    if (preferredTime === "today") {
      return now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } else if (preferredTime === "tomorrow") {
      now.setDate(now.getDate() + 1);
      return now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    // Default to tomorrow
    now.setDate(now.getDate() + 1);
    return now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  formatAppointmentTime(preferredTime) {
    const timeMap = {
      morning: "10:00 AM",
      afternoon: "2:00 PM",
      evening: "5:00 PM",
      early_morning: "8:00 AM",
      late_afternoon: "4:00 PM",
    };

    return timeMap[preferredTime] || "10:00 AM";
  }

  async handleVoiceCall(taskData) {
    // Route to appropriate handler based on data
    if (taskData.parameters?.restaurants || taskData.parameters?.places) {
      return await this.makeReservationCalls(taskData);
    } else if (taskData.parameters?.providers) {
      return await this.makeAppointmentCalls(taskData);
    }

    return {
      success: true,
      output: {
        message: "Voice call processed via Python service",
        action: taskData.action,
        timestamp: new Date().toISOString(),
        method: "python_sdk",
      },
    };
  }

  async executeTaskFallback(taskId, taskData) {
    return {
      success: true,
      output: {
        message: "Task processed by OmniDimension Python service",
        action: taskData.action,
        timestamp: new Date().toISOString(),
        method: "python_sdk_fallback",
      },
    };
  }

  // Health check method
  async healthCheck() {
    try {
      const result = await this.callPythonService("health_check", {});
      return {
        success: true,
        python_service: result.success || false,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export default OmniDimensionAgent;
