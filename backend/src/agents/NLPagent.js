/**
 * NLP Agent - Fixed Input Validation Issues
 * Current Date and Time: 2025-06-20 12:11:52 UTC
 * Current User: ayush20244048
 */

import BaseAgent from "./BaseAgent.js";
import { AGENT_TYPES } from "../config/constants.js";
import { logger } from "../utils/logger.js";

export class NLPAgent extends BaseAgent {
  constructor() {
    const capabilities = [
      "intent_parsing",
      "entity_extraction",
      "text_generation",
      "sentiment_analysis",
      "language_understanding",
      "conversation_context",
    ];

    const systemPrompt = `
You are the NLP Agent, specialized in natural language processing and understanding.

Your primary responsibilities:
1. Parse user intents from natural language input
2. Extract relevant entities (dates, locations, names, preferences)
3. Generate natural, contextual responses
4. Analyze sentiment and emotional context
5. Maintain conversation context and memory
6. Provide confidence scores for all analysis

Intent Categories you handle:
- book_appointment: User wants to schedule appointments (medical, dental, beauty, professional)
- find_restaurant: User wants to find restaurants or dining options
- make_reservation: User wants to make restaurant reservations
- general_inquiry: User asking questions or seeking information
- modify_booking: User wants to change existing bookings
- cancel_booking: User wants to cancel bookings
- get_recommendations: User seeking suggestions

Entity Types to extract:
- service_type: Type of service (doctor, dentist, restaurant, etc.)
- location: Geographic locations, addresses, neighborhoods
- date_time: Dates, times, relative time expressions
- contact_info: Names, phone numbers, email addresses
- preferences: User preferences, requirements, constraints
- party_size: Number of people (for reservations)
- cuisine_type: Food preferences, dietary restrictions
- price_range: Budget constraints, price preferences

Always provide structured JSON responses with:
- intent: Main user intention
- confidence: Confidence score (0-1)
- entities: Extracted structured data
- workflow_type: Recommended workflow type
- suggested_actions: Next steps for orchestrator
- context_updates: Information to maintain in conversation context

Be thorough, accurate, and context-aware in all analysis.
Current Time: 2025-06-20 12:11:52 UTC
Current User: ayush20244048
    `;

    super(AGENT_TYPES.NLP, capabilities, systemPrompt);
  }

  async executeTask(taskId, taskData) {
    logger.info(
      `🧠 NLP Agent executing task at 2025-06-20 12:11:52: ${taskId}`,
      {
        action: taskData?.action,
        currentUser: "ayush20244048",
      }
    );

    try {
      // Validate taskData exists
      if (!taskData || typeof taskData !== "object") {
        throw new Error("Invalid taskData provided - must be an object");
      }

      const action = taskData.action;
      if (!action || typeof action !== "string") {
        throw new Error("Invalid action provided - must be a non-empty string");
      }

      switch (action) {
        case "parse_intent":
          return await this.parseIntent(taskData);
        case "extract_entities":
          return await this.extractEntities(taskData);
        case "text_generation":
          return await this.generateText(taskData);
        case "sentiment_analysis":
          return await this.analyzeSentiment(taskData);
        case "context_analysis":
          return await this.analyzeContext(taskData);
        case "conversation_summary":
          return await this.summarizeConversation(taskData);
        default:
          logger.warn(
            `⚠️ Unknown NLP action at 2025-06-20 12:11:52: ${action}`
          );
          return await super.executeTask(taskId, taskData);
      }
    } catch (error) {
      logger.error(
        `❌ NLP Agent task execution failed at 2025-06-20 12:11:52:`,
        error
      );
      throw error;
    }
  }

  async parseIntent(taskData) {
    try {
      // FIXED: Enhanced text extraction with multiple field checks
      let text = "";

      // Try multiple possible field names for the text content
      const textSources = [
        taskData.text,
        taskData.userMessage,
        taskData.message,
        taskData.content,
        taskData.prompt,
        taskData.parameters?.text,
        taskData.parameters?.userMessage,
        taskData.parameters?.message,
      ];

      // Find the first non-empty text source
      for (const source of textSources) {
        if (source && typeof source === "string" && source.trim().length > 0) {
          text = source.trim();
          break;
        }
      }

      const context = taskData.context || taskData.parameters?.context || {};

      // DEBUGGING: Log what we found
      logger.info(`🔍 NLP text extraction at 2025-06-20 12:16:14:`, {
        taskDataKeys: Object.keys(taskData),
        textSources: textSources.map((s) => ({
          hasValue: !!s,
          type: typeof s,
          length: s?.length,
          preview: typeof s === "string" ? s.substring(0, 30) : s,
        })),
        extractedText: text?.substring(0, 100),
        extractedTextLength: text?.length,
        currentUser: "ayush20244048",
      });

      // FIXED: Check if text is defined and has length property
      if (!text || typeof text !== "string" || text.length === 0) {
        logger.warn(
          `⚠️ No valid text found for intent parsing at 2025-06-20 12:16:14`,
          {
            taskData: JSON.stringify(taskData, null, 2),
            currentUser: "ayush20244048",
          }
        );

        return {
          success: true,
          result: {
            intent: "general_inquiry",
            confidence: 0.3,
            entities: {},
            workflow_type: "general_query",
            suggested_actions: ["process_general_request"],
            context_updates: {},
          },
          metadata: {
            processingTime: Date.now(),
            agentType: "nlp",
            fallback: true,
            reason: "no_text_found",
            currentUser: "ayush20244048",
            timestamp: "2025-06-20 12:16:14",
          },
        };
      }

      logger.info(
        `🔍 Parsing intent for text at 2025-06-20 12:16:14: "${text.substring(
          0,
          100
        )}..."`
      );

      // Try to use Gemini tool first
      let analysis;
      try {
        analysis = await this.parseIntentWithGemini(text, context);
      } catch (geminiError) {
        logger.warn(
          `⚠️ Gemini parsing failed at 2025-06-20 12:16:14, using fallback:`,
          geminiError.message
        );
        analysis = this.parseIntentFallback(text, context);
      }

      // Validate and enhance analysis
      analysis = this.validateAndEnhanceAnalysis(analysis, text, context);

      logger.info(`✅ Intent analysis completed at 2025-06-20 12:16:14:`, {
        intent: analysis.intent,
        confidence: analysis.confidence,
        workflowType: analysis.workflow_type,
        hasEntities: Object.keys(analysis.entities || {}).length > 0,
        currentUser: "ayush20244048",
      });

      return {
        success: true,
        result: analysis,
        metadata: {
          processingTime: Date.now(),
          agentType: "nlp",
          confidence: analysis.confidence,
          textLength: text.length,
          currentUser: "ayush20244048",
          timestamp: "2025-06-20 12:16:14",
        },
      };
    } catch (error) {
      logger.error(`❌ Intent parsing failed at 2025-06-20 12:16:14:`, error);
      throw new Error(`Intent parsing failed: ${error.message}`);
    }
  }

  async parseIntentWithGemini(text, context) {
    // Find Gemini tool
    const geminiTool = this.tools?.find((tool) => tool.name === "gemini_llm");

    if (!geminiTool) {
      logger.warn(
        `⚠️ Gemini tool not available at 2025-06-20 12:11:52, using fallback`
      );
      return this.parseIntentFallback(text, context);
    }

    const analysisPrompt = `
  Analyze this user message and provide intent parsing results:
  
  User Message: "${text}"
  Context: ${JSON.stringify(context)}
  
  Respond with a JSON object containing:
  {
    "intent": "book_appointment|find_restaurant|make_reservation|general_inquiry|modify_booking|cancel_booking",
    "confidence": 0.95,
    "entities": {
      "service_type": "extracted service type",
      "location": "extracted location",
      "date_time": "extracted date/time",
      "contact_info": {},
      "preferences": {},
      "party_size": "number",
      "cuisine_type": "food preferences"
    },
    "workflow_type": "appointment|restaurant|general_query|custom",
    "suggested_actions": ["action1", "action2"],
    "context_updates": {}
  }
  
  Be thorough and accurate. Current time: 2025-06-20 12:11:52 UTC, User: ayush20244048
    `;

    const analysisInput = JSON.stringify({
      task: "intent_parsing",
      prompt: analysisPrompt,
      parameters: {
        temperature: 0.3,
        maxTokens: 1000,
      },
    });

    const result = await geminiTool._call(analysisInput);
    const parsedResult = JSON.parse(result);

    if (!parsedResult.success) {
      throw new Error(`Gemini analysis failed: ${parsedResult.error}`);
    }

    let analysis;
    try {
      // FIXED: Handle both object and string responses
      let rawResult = parsedResult.result;

      logger.info(`🔍 Raw Gemini result at 2025-06-20 12:23:20:`, {
        rawResult: rawResult,
        type: typeof rawResult,
        isObject: typeof rawResult === "object" && rawResult !== null,
        currentUser: "ayush20244048",
      });

      // Check if result is already an object (parsed JSON)
      if (typeof rawResult === "object" && rawResult !== null) {
        // Result is already parsed - use it directly
        analysis = rawResult;

        logger.info(`✅ Using pre-parsed object at 2025-06-20 12:23:20:`, {
          intent: analysis.intent,
          confidence: analysis.confidence,
          hasEntities: Object.keys(analysis.entities || {}).length > 0,
          currentUser: "ayush20244048",
        });
      } else if (typeof rawResult === "string") {
        // Result is a string - needs parsing
        let cleanResult = rawResult;

        // Remove markdown code blocks
        cleanResult = cleanResult
          .replace(/^```(?:json)?\s*\n?/gm, "") // Remove opening ```json
          .replace(/\n?```\s*$/gm, "") // Remove closing ```
          .trim();

        // Additional cleanup for edge cases
        if (cleanResult.startsWith("```") || cleanResult.endsWith("```")) {
          cleanResult = cleanResult.replace(/```/g, "").trim();
        }

        // If still wrapped in backticks
        cleanResult = cleanResult.replace(/^`+|`+$/g, "").trim();

        logger.info(`🧹 Cleaning string result at 2025-06-20 12:23:20:`, {
          originalLength: rawResult.length,
          cleanedLength: cleanResult.length,
          startsWithBrace: cleanResult.startsWith("{"),
          endsWithBrace: cleanResult.endsWith("}"),
          currentUser: "ayush20244048",
        });

        // Parse the cleaned string
        analysis = JSON.parse(cleanResult);

        logger.info(
          `✅ Successfully parsed string JSON at 2025-06-20 12:23:20:`,
          {
            intent: analysis.intent,
            confidence: analysis.confidence,
            currentUser: "ayush20244048",
          }
        );
      } else {
        throw new Error(`Unexpected result type: ${typeof rawResult}`);
      }
    } catch (parseError) {
      logger.error(
        `❌ Failed to process Gemini response at 2025-06-20 12:23:20:`,
        {
          error: parseError.message,
          resultType: typeof parsedResult.result,
          resultPreview:
            typeof parsedResult.result === "string"
              ? parsedResult.result?.substring(0, 100)
              : JSON.stringify(parsedResult.result)?.substring(0, 100),
          currentUser: "ayush20244048",
        }
      );

      // Fallback to rule-based parsing
      return this.parseIntentFallback(text, context);
    }

    return analysis;
  }

  async extractEntities(taskData) {
    try {
      // FIXED: Validate input parameters
      if (!taskData) {
        throw new Error("taskData is required for entity extraction");
      }

      const text = taskData.text || taskData.prompt || taskData.message || "";
      const entityTypes = Array.isArray(taskData.entityTypes)
        ? taskData.entityTypes
        : [];
      const context = taskData.context || {};

      if (typeof text !== "string" || text.length === 0) {
        logger.warn(
          `⚠️ Invalid text for entity extraction at 2025-06-20 12:11:52`
        );
        return {
          success: true,
          result: {},
          metadata: {
            processingTime: Date.now(),
            entityCount: 0,
            fallback: true,
            currentUser: "ayush20244048",
            timestamp: "2025-06-20 12:11:52",
          },
        };
      }

      logger.info(
        `🔍 Extracting entities from text at 2025-06-20 12:11:52: "${text.substring(
          0,
          50
        )}..."`
      );

      let entities;
      try {
        entities = await this.extractEntitiesWithGemini(
          text,
          entityTypes,
          context
        );
      } catch (error) {
        logger.warn(
          `⚠️ Gemini entity extraction failed at 2025-06-20 12:11:52, using fallback`
        );
        entities = this.extractEntitiesFallback(text, entityTypes);
      }

      // Post-process and validate entities
      entities = this.postProcessEntities(entities, text);

      return {
        success: true,
        result: entities,
        metadata: {
          processingTime: Date.now(),
          entityCount: Object.keys(entities).length,
          currentUser: "ayush20244048",
          timestamp: "2025-06-20 12:11:52",
        },
      };
    } catch (error) {
      logger.error(
        `❌ Entity extraction failed at 2025-06-20 12:11:52:`,
        error
      );
      throw error;
    }
  }

  async extractEntitiesWithGemini(text, entityTypes, context) {
    const geminiTool = this.tools?.find((tool) => tool.name === "gemini_llm");

    if (!geminiTool) {
      return this.extractEntitiesFallback(text, entityTypes);
    }

    const entityPrompt = `
  Extract entities from this text:
  
  Text: "${text}"
  Requested Entity Types: ${entityTypes.join(", ") || "all relevant entities"}
  Context: ${JSON.stringify(context)}
  
  Extract and return a JSON object with these entities:
  {
    "service_type": "type of service mentioned",
    "location": "location or address",
    "date_time": "date, time, or when",
    "contact_info": {
      "name": "person name",
      "phone": "phone number",
      "email": "email address"
    },
    "preferences": "user preferences or requirements",
    "party_size": "number of people",
    "cuisine_type": "food type or dietary preferences",
    "price_range": "budget or price level"
  }
  
  Only include entities that are clearly mentioned in the text.
  Current time: 2025-06-20 12:11:52 UTC, User: ayush20244048
    `;

    const extractionInput = JSON.stringify({
      task: "entity_extraction",
      prompt: entityPrompt,
      parameters: {
        temperature: 0.2,
        maxTokens: 800,
      },
    });

    const result = await geminiTool._call(extractionInput);
    const parsedResult = JSON.parse(result);

    if (!parsedResult.success) {
      throw new Error(`Gemini entity extraction failed: ${parsedResult.error}`);
    }

    let entities;
    try {
      // FIXED: Handle both object and string responses
      let rawResult = parsedResult.result;

      // Check if result is already an object (parsed JSON)
      if (typeof rawResult === "object" && rawResult !== null) {
        // Result is already parsed - use it directly
        entities = rawResult;
      } else if (typeof rawResult === "string") {
        // Result is a string - needs parsing
        let cleanResult = rawResult;

        // Remove markdown code blocks
        cleanResult = cleanResult
          .replace(/^```(?:json)?\s*\n?/gm, "")
          .replace(/\n?```\s*$/gm, "")
          .trim();

        if (cleanResult.startsWith("```") || cleanResult.endsWith("```")) {
          cleanResult = cleanResult.replace(/```/g, "").trim();
        }

        cleanResult = cleanResult.replace(/^`+|`+$/g, "").trim();

        // Parse the cleaned string
        entities = JSON.parse(cleanResult);
      } else {
        throw new Error(`Unexpected result type: ${typeof rawResult}`);
      }
    } catch (parseError) {
      logger.error(
        `❌ Failed to process entity extraction response at 2025-06-20 12:11:52:`,
        {
          error: parseError.message,
          resultType: typeof parsedResult.result,
          currentUser: "ayush20244048",
        }
      );
      return this.extractEntitiesFallback(text, entityTypes);
    }

    return entities;
  }

  async generateText(taskData) {
    try {
      // FIXED: Validate input parameters
      if (!taskData) {
        throw new Error("taskData is required for text generation");
      }

      const prompt = taskData.prompt || taskData.text || taskData.message || "";
      const context = taskData.context || {};
      const task = taskData.task || "general";
      const parameters = taskData.parameters || {};

      if (typeof prompt !== "string" || prompt.length === 0) {
        logger.warn(
          `⚠️ Invalid prompt for text generation at 2025-06-20 12:11:52`
        );
        return {
          success: true,
          result:
            "I understand you'd like me to help you. Could you please provide more details about what you need?",
          metadata: {
            processingTime: Date.now(),
            textLength: 82,
            task: task,
            fallback: true,
            currentUser: "ayush20244048",
            timestamp: "2025-06-20 12:11:52",
          },
        };
      }

      logger.info(
        `📝 Generating text response at 2025-06-20 12:11:52 for task: ${task}`
      );

      let generatedText;
      try {
        generatedText = await this.generateTextWithGemini(
          prompt,
          context,
          task,
          parameters
        );
      } catch (error) {
        logger.warn(
          `⚠️ Gemini text generation failed at 2025-06-20 12:11:52, using fallback`
        );
        generatedText = this.generateTextFallback(prompt, context, task);
      }

      // Post-process the generated text
      generatedText = this.postProcessGeneratedText(generatedText, task);

      return {
        success: true,
        result: generatedText,
        metadata: {
          processingTime: Date.now(),
          textLength: generatedText.length,
          task: task,
          currentUser: "ayush20244048",
          timestamp: "2025-06-20 12:11:52",
        },
      };
    } catch (error) {
      logger.error(`❌ Text generation failed at 2025-06-20 12:11:52:`, error);
      throw error;
    }
  }

  async generateTextWithGemini(prompt, context, task, parameters) {
    const geminiTool = this.tools?.find((tool) => tool.name === "gemini_llm");

    if (!geminiTool) {
      return this.generateTextFallback(prompt, context, task);
    }

    const generationPrompt = `
Generate a helpful, natural response for this request:

User Request: "${prompt}"
Context: ${JSON.stringify(context)}
Task Type: ${task}

Generate a conversational, helpful response that:
- Addresses the user's request directly
- Is natural and engaging
- Provides useful information or next steps
- Maintains a professional but friendly tone

Current time: 2025-06-20 12:11:52 UTC
Current user: ayush20244048
    `;

    const generationInput = JSON.stringify({
      task: "text_generation",
      prompt: generationPrompt,
      parameters: {
        temperature: parameters.temperature || 0.7,
        maxTokens: parameters.maxTokens || 1000,
      },
    });

    const result = await geminiTool._call(generationInput);
    const parsedResult = JSON.parse(result);

    if (!parsedResult.success) {
      throw new Error(`Gemini text generation failed: ${parsedResult.error}`);
    }

    return parsedResult.result;
  }

  generateTextFallback(prompt, context, task) {
    // Simple fallback text generation
    const lowercasePrompt = prompt.toLowerCase();

    if (
      lowercasePrompt.includes("appointment") ||
      lowercasePrompt.includes("book")
    ) {
      return "I'd be happy to help you book an appointment! To get started, I'll need to know what type of service you're looking for and your preferred timing. Let me search for available options in your area.";
    }

    if (
      lowercasePrompt.includes("restaurant") ||
      lowercasePrompt.includes("reservation")
    ) {
      return "I can help you find a great restaurant and make a reservation! What type of cuisine are you interested in, and what's your preferred date and time?";
    }

    if (lowercasePrompt.includes("help") || lowercasePrompt.includes("how")) {
      return "I'm here to help you with appointments, restaurant reservations, and various other tasks. What would you like assistance with today?";
    }

    return "I understand you need assistance. Could you please provide more details about what you'd like me to help you with? I can assist with booking appointments, finding restaurants, making reservations, and much more.";
  }

  // Helper methods for fallback processing
  parseIntentFallback(text, context) {
    if (!text || typeof text !== "string") {
      text = "";
    }

    const lowercaseText = text.toLowerCase();

    // Simple rule-based intent detection
    let intent = "general_inquiry";
    let confidence = 0.6;
    let workflow_type = "general_query";

    if (
      lowercaseText.includes("book") ||
      lowercaseText.includes("appointment") ||
      lowercaseText.includes("schedule")
    ) {
      intent = "book_appointment";
      workflow_type = "appointment";
      confidence = 0.8;
    } else if (
      lowercaseText.includes("restaurant") ||
      lowercaseText.includes("reserve") ||
      lowercaseText.includes("dinner")
    ) {
      intent = "find_restaurant";
      workflow_type = "restaurant";
      confidence = 0.8;
    } else if (
      lowercaseText.includes("cancel") ||
      lowercaseText.includes("change")
    ) {
      intent = "modify_booking";
      workflow_type = "custom";
      confidence = 0.7;
    }

    return {
      intent,
      confidence,
      entities: this.extractEntitiesFallback(text, []),
      workflow_type,
      suggested_actions: [`process_${workflow_type}_request`],
      context_updates: {},
    };
  }

  extractEntitiesFallback(text, entityTypes) {
    if (!text || typeof text !== "string") {
      return {};
    }

    const entities = {};

    // Simple regex-based entity extraction
    const patterns = {
      phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      date: /\b(?:tomorrow|today|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/gi,
      time: /\b(?:\d{1,2}:\d{2}\s?(?:am|pm|AM|PM)|\d{1,2}\s?(?:am|pm|AM|PM))\b/g,
    };

    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        entities[type] = matches.length === 1 ? matches[0] : matches;
      }
    });

    return entities;
  }

  validateAndEnhanceAnalysis(analysis, originalText, context) {
    // Ensure analysis is an object
    if (!analysis || typeof analysis !== "object") {
      analysis = {};
    }

    // Ensure required fields exist with safe defaults
    if (!analysis.intent || typeof analysis.intent !== "string") {
      analysis.intent = "general_inquiry";
    }
    if (typeof analysis.confidence !== "number" || isNaN(analysis.confidence)) {
      analysis.confidence = 0.5;
    }
    if (!analysis.entities || typeof analysis.entities !== "object") {
      analysis.entities = {};
    }
    if (!analysis.workflow_type || typeof analysis.workflow_type !== "string") {
      analysis.workflow_type = "general_query";
    }
    if (!Array.isArray(analysis.suggested_actions)) {
      analysis.suggested_actions = ["process_request"];
    }
    if (
      !analysis.context_updates ||
      typeof analysis.context_updates !== "object"
    ) {
      analysis.context_updates = {};
    }

    // Enhance with additional context
    if (context && typeof context === "object") {
      if (context.user_location && !analysis.entities.location) {
        analysis.entities.user_location = context.user_location;
      }

      if (
        context.user_preferences &&
        typeof context.user_preferences === "object"
      ) {
        analysis.entities.preferences = {
          ...analysis.entities.preferences,
          ...context.user_preferences,
        };
      }
    }

    // Validate confidence score
    if (analysis.confidence < 0) analysis.confidence = 0;
    if (analysis.confidence > 1) analysis.confidence = 1;

    return analysis;
  }

  postProcessEntities(entities, originalText) {
    if (!entities || typeof entities !== "object") {
      return {};
    }

    // Clean up and validate extracted entities
    Object.keys(entities).forEach((key) => {
      if (Array.isArray(entities[key])) {
        // Remove duplicates and empty values
        entities[key] = [...new Set(entities[key])].filter(
          (item) =>
            item != null && (typeof item === "string" ? item.trim() : true)
        );

        // If only one item, convert to string
        if (entities[key].length === 1) {
          entities[key] = entities[key][0];
        } else if (entities[key].length === 0) {
          delete entities[key];
        }
      } else if (typeof entities[key] === "string") {
        entities[key] = entities[key].trim();
        if (!entities[key]) {
          delete entities[key];
        }
      } else if (entities[key] == null) {
        delete entities[key];
      }
    });

    return entities;
  }

  postProcessGeneratedText(text, task) {
    if (!text || typeof text !== "string") {
      return "I'm here to help! Could you please let me know what you need assistance with?";
    }

    // Clean up generated text
    let cleanText = text.trim();

    // Remove any JSON formatting if it leaked through
    if (cleanText.startsWith("{") && cleanText.endsWith("}")) {
      try {
        const parsed = JSON.parse(cleanText);
        if (parsed.response || parsed.text || parsed.content) {
          cleanText = parsed.response || parsed.text || parsed.content;
        }
      } catch (error) {
        // Keep original text if JSON parsing fails
      }
    }

    // Remove common AI response prefixes
    const prefixesToRemove = [
      "Here is the response:",
      "Response:",
      "Generated text:",
      "AI:",
      "Assistant:",
    ];

    prefixesToRemove.forEach((prefix) => {
      if (cleanText.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleanText = cleanText.substring(prefix.length).trim();
      }
    });

    // Ensure minimum length
    if (cleanText.length < 10) {
      cleanText =
        "I understand you need help. Could you please provide more details about what you're looking for?";
    }

    return cleanText;
  }

  // Additional helper methods remain the same but with null checks...

  async analyzeSentiment(taskData) {
    try {
      if (!taskData || !taskData.text) {
        return {
          success: true,
          result: {
            sentiment: "neutral",
            confidence: 0.5,
            emotional_indicators: [],
            tone: "casual",
            urgency_level: 1,
          },
          metadata: {
            processingTime: Date.now(),
            fallback: true,
            currentUser: "ayush20244048",
            timestamp: "2025-06-20 12:11:52",
          },
        };
      }

      const { text, context = {} } = taskData;
      logger.info(`🎭 Analyzing sentiment at 2025-06-20 12:11:52`);

      const sentiment = this.analyzeSentimentFallback(text);

      return {
        success: true,
        result: sentiment,
        metadata: {
          processingTime: Date.now(),
          confidence: sentiment.confidence,
          currentUser: "ayush20244048",
          timestamp: "2025-06-20 12:11:52",
        },
      };
    } catch (error) {
      logger.error(
        `❌ Sentiment analysis failed at 2025-06-20 12:11:52:`,
        error
      );
      throw error;
    }
  }

  analyzeSentimentFallback(text) {
    if (!text || typeof text !== "string") {
      return {
        sentiment: "neutral",
        confidence: 0.5,
        emotional_indicators: [],
        tone: "casual",
        urgency_level: 1,
        satisfaction_indicators: { positive: [], negative: [] },
      };
    }

    const positiveWords = [
      "great",
      "good",
      "excellent",
      "love",
      "happy",
      "pleased",
      "satisfied",
      "perfect",
      "wonderful",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "hate",
      "disappointed",
      "frustrated",
      "angry",
      "awful",
      "horrible",
    ];
    const urgentWords = [
      "urgent",
      "asap",
      "immediately",
      "now",
      "emergency",
      "quickly",
      "soon",
    ];

    const words = text.toLowerCase().split(/\s+/);

    let positiveCount = 0;
    let negativeCount = 0;
    let urgentCount = 0;

    words.forEach((word) => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
      if (urgentWords.includes(word)) urgentCount++;
    });

    let sentiment = "neutral";
    let confidence = 0.6;

    if (positiveCount > negativeCount) {
      sentiment = "positive";
      confidence = Math.min(
        0.9,
        0.5 + (positiveCount / Math.max(words.length, 1)) * 2
      );
    } else if (negativeCount > positiveCount) {
      sentiment = "negative";
      confidence = Math.min(
        0.9,
        0.5 + (negativeCount / Math.max(words.length, 1)) * 2
      );
    }

    return {
      sentiment,
      confidence,
      emotional_indicators: [],
      tone: urgentCount > 0 ? "urgent" : "casual",
      urgency_level: Math.min(
        10,
        Math.max(1, urgentCount * 3 + negativeCount * 2)
      ),
      satisfaction_indicators: {
        positive: positiveWords.filter((word) => words.includes(word)),
        negative: negativeWords.filter((word) => words.includes(word)),
      },
    };
  }
}

export default NLPAgent;
