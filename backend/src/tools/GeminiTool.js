/**
 * Gemini Tool - Debug and Fix JSON Response Issue
 * Current Date and Time: 2025-06-20 12:23:20 UTC
 * Current User: ayush20244048
 */

import { Tool } from "@langchain/core/tools";
import { createGeminiModel } from "../config/langchain.js";
import { logger } from "../utils/logger.js";

export class GeminiTool extends Tool {
  constructor() {
    super();
    this.name = "gemini_llm";
    this.description = `
      Use this tool to interact with Google's Gemini LLM for:
      - Intent classification and entity extraction
      - Natural language generation
      - Text analysis and understanding
      - Content generation and summarization
    `;
    this.model = createGeminiModel();
  }

  async _call(input) {
    try {
      logger.info(`🤖 Gemini tool called at 2025-06-20 12:23:20`, {
        inputLength: input?.length,
        currentUser: "ayush20244048",
      });

      const { task, prompt, context, parameters = {} } = JSON.parse(input);

      let fullPrompt = "";

      switch (task) {
        case "intent_parsing":
          fullPrompt = this.buildIntentParsingPrompt(prompt, context);
          break;
        case "text_generation":
          fullPrompt = this.buildTextGenerationPrompt(prompt, context);
          break;
        case "analysis":
          fullPrompt = this.buildAnalysisPrompt(prompt, context);
          break;
        case "entity_extraction":
          fullPrompt = this.buildEntityExtractionPrompt(prompt, context);
          break;
        default:
          fullPrompt = prompt;
      }

      logger.debug(`📤 Sending to Gemini at 2025-06-20 12:23:20:`, {
        task,
        promptLength: fullPrompt.length,
        promptPreview: fullPrompt.substring(0, 200),
        currentUser: "ayush20244048",
      });

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      let rawText = response.text();

      // ENHANCED DEBUGGING: Log the exact raw response
      logger.info(`📥 Raw Gemini response at 2025-06-20 12:23:20:`, {
        task,
        rawTextLength: rawText?.length,
        rawTextType: typeof rawText,
        rawTextFull: rawText, // LOG THE FULL RESPONSE TO SEE WHAT'S WRONG
        hasNewlines: rawText?.includes("\n"),
        hasMarkdown: rawText?.includes("```"),
        startsWithBrace: rawText?.trim().startsWith("{"),
        endsWithBrace: rawText?.trim().endsWith("}"),
        currentUser: "ayush20244048",
      });

      // FIXED: More aggressive cleaning and parsing
      const cleanedResponse = this.aggressiveCleanAndParse(rawText, task);

      logger.info(`✅ Gemini response processed at 2025-06-20 12:23:20:`, {
        task,
        success: true,
        cleanedType: typeof cleanedResponse,
        cleanedKeys:
          typeof cleanedResponse === "object"
            ? Object.keys(cleanedResponse)
            : "N/A",
        currentUser: "ayush20244048",
      });

      return JSON.stringify({
        success: true,
        task,
        result: cleanedResponse,
        metadata: {
          timestamp: "2025-06-20 12:23:20",
          tokensUsed: this.estimateTokens(fullPrompt + rawText),
          currentUser: "ayush20244048",
          processingMethod: "aggressive_clean",
        },
      });
    } catch (error) {
      logger.error(`❌ Gemini tool error at 2025-06-20 12:23:20:`, {
        error: error.message,
        stack: error.stack,
        currentUser: "ayush20244048",
      });

      return JSON.stringify({
        success: false,
        error: error.message,
        timestamp: "2025-06-20 12:23:20",
        currentUser: "ayush20244048",
      });
    }
  }

  /**
   * AGGRESSIVE cleaning and parsing - handles all edge cases
   */
  aggressiveCleanAndParse(rawText, task) {
    if (!rawText || typeof rawText !== "string") {
      logger.warn(`⚠️ Invalid rawText at 2025-06-20 12:23:20:`, {
        rawText,
        type: typeof rawText,
        currentUser: "ayush20244048",
      });
      return this.getFallbackResponse(task);
    }

    try {
      logger.debug(`🧹 Starting aggressive clean at 2025-06-20 12:23:20:`, {
        originalLength: rawText.length,
        originalPreview: rawText.substring(0, 100),
        currentUser: "ayush20244048",
      });

      // Step 1: Remove ALL markdown formatting
      let cleaned = rawText
        .replace(/```json\s*/gi, "") // Remove ```json
        .replace(/```javascript\s*/gi, "") // Remove ```javascript
        .replace(/```\s*/gi, "") // Remove remaining ```
        .replace(/^```[\s\S]*?```$/gm, "") // Remove entire code blocks
        .replace(/`/g, "") // Remove all backticks
        .trim();

      logger.debug(`🧹 After markdown removal at 2025-06-20 12:23:20:`, {
        cleanedLength: cleaned.length,
        cleanedPreview: cleaned.substring(0, 100),
        currentUser: "ayush20244048",
      });

      // Step 2: Extract JSON object more aggressively
      if (
        task === "intent_parsing" ||
        task === "analysis" ||
        task === "entity_extraction"
      ) {
        return this.extractJSONAggressively(cleaned, task);
      }

      // Step 3: For text generation, extract the actual text content
      if (task === "text_generation") {
        return this.extractTextContentAggressively(cleaned);
      }

      // Step 4: Last resort - try direct JSON parse
      try {
        const parsed = JSON.parse(cleaned);
        logger.info(`✅ Direct JSON parse successful at 2025-06-20 12:23:20`);
        return parsed;
      } catch (directParseError) {
        logger.warn(`⚠️ Direct JSON parse failed at 2025-06-20 12:23:20:`, {
          error: directParseError.message,
          currentUser: "ayush20244048",
        });
        return this.getFallbackResponse(task);
      }
    } catch (error) {
      logger.error(`❌ Aggressive cleaning failed at 2025-06-20 12:23:20:`, {
        error: error.message,
        task,
        currentUser: "ayush20244048",
      });
      return this.getFallbackResponse(task);
    }
  }

  /**
   * Extract JSON with multiple strategies
   */
  extractJSONAggressively(text, task) {
    try {
      // Strategy 1: Find complete JSON object
      const jsonRegex = /\{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*\}/g;
      const jsonMatches = text.match(jsonRegex);

      if (jsonMatches && jsonMatches.length > 0) {
        // Try each JSON match until one parses successfully
        for (let i = 0; i < jsonMatches.length; i++) {
          try {
            const jsonStr = jsonMatches[i];
            logger.debug(
              `🔍 Trying JSON match ${i + 1} at 2025-06-20 12:23:20:`,
              {
                jsonStr: jsonStr.substring(0, 200),
                currentUser: "ayush20244048",
              }
            );

            const parsed = JSON.parse(jsonStr);

            // Validate it has expected fields for intent parsing
            if (task === "intent_parsing") {
              if (parsed.intent || parsed.workflow_type) {
                logger.info(
                  `✅ Valid intent JSON found at 2025-06-20 12:23:20`
                );
                return this.validateIntentResponse(parsed);
              }
            } else {
              logger.info(`✅ Valid JSON found at 2025-06-20 12:23:20`);
              return parsed;
            }
          } catch (parseError) {
            logger.debug(
              `⚠️ JSON match ${i + 1} parse failed:`,
              parseError.message
            );
            continue;
          }
        }
      }

      // Strategy 2: Try to fix common JSON issues
      const fixedText = this.fixCommonJSONIssues(text);
      try {
        const parsed = JSON.parse(fixedText);
        logger.info(`✅ Fixed JSON parse successful at 2025-06-20 12:23:20`);
        return task === "intent_parsing"
          ? this.validateIntentResponse(parsed)
          : parsed;
      } catch (fixedParseError) {
        logger.debug(`⚠️ Fixed JSON parse failed:`, fixedParseError.message);
      }

      // Strategy 3: Manual extraction for intent parsing
      if (task === "intent_parsing") {
        return this.manualIntentExtraction(text);
      }

      // Strategy 4: Fallback
      logger.warn(
        `⚠️ All JSON extraction strategies failed at 2025-06-20 12:23:20`
      );
      return this.getFallbackResponse(task);
    } catch (error) {
      logger.error(`❌ JSON extraction failed at 2025-06-20 12:23:20:`, error);
      return this.getFallbackResponse(task);
    }
  }

  /**
   * Fix common JSON formatting issues
   */
  fixCommonJSONIssues(text) {
    return (
      text
        // Fix missing quotes around keys
        .replace(/(\w+)(\s*:\s*)/g, '"$1"$2')
        // Fix single quotes to double quotes
        .replace(/'/g, '"')
        // Fix trailing commas
        .replace(/,(\s*[}\]])/g, "$1")
        // Fix missing commas between objects
        .replace(/}(\s*{)/g, "},$1")
        // Remove any leading/trailing non-JSON content
        .replace(/^[^{]*/, "")
        .replace(/[^}]*$/, "")
    );
  }

  /**
   * Extract text content from generation responses
   */
  extractTextContentAggressively(text) {
    // Remove common prefixes
    let cleanText = text
      .replace(/^(Response|Answer|Generated text|Here is|Here's):\s*/i, "")
      .replace(/^(The response is|My response is):\s*/i, "")
      .trim();

    // If it looks like JSON, try to extract text field
    if (cleanText.startsWith("{") && cleanText.endsWith("}")) {
      try {
        const parsed = JSON.parse(cleanText);
        if (parsed.response) return parsed.response;
        if (parsed.text) return parsed.text;
        if (parsed.content) return parsed.content;
        if (parsed.answer) return parsed.answer;
      } catch (error) {
        // Continue with text as-is
      }
    }

    // Clean up any remaining artifacts
    cleanText = cleanText
      .replace(/^["']|["']$/g, "") // Remove quotes at start/end
      .replace(/\\n/g, "\n") // Fix escaped newlines
      .trim();

    return (
      cleanText ||
      "I understand you need help. Could you please provide more details?"
    );
  }

  /**
   * Validate and fix intent parsing response
   */
  validateIntentResponse(response) {
    const validated = {
      intent: response.intent || "general_inquiry",
      confidence: this.validateConfidence(response.confidence),
      entities: response.entities || {},
      workflow_type:
        response.workflow_type || this.inferWorkflowType(response.intent),
      suggested_actions: Array.isArray(response.suggested_actions)
        ? response.suggested_actions
        : ["process_request"],
      context_updates: response.context_updates || {},
    };

    logger.debug(`✅ Intent response validated at 2025-06-20 12:23:20:`, {
      originalKeys: Object.keys(response),
      validatedKeys: Object.keys(validated),
      currentUser: "ayush20244048",
    });

    return validated;
  }

  /**
   * Validate confidence score
   */
  validateConfidence(confidence) {
    if (typeof confidence === "number" && confidence >= 0 && confidence <= 1) {
      return confidence;
    }
    if (typeof confidence === "string") {
      const parsed = parseFloat(confidence);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
    return 0.6; // Default confidence
  }

  /**
   * Infer workflow type from intent
   */
  inferWorkflowType(intent) {
    switch (intent) {
      case "book_appointment":
      case "schedule_appointment":
        return "appointment";
      case "find_restaurant":
      case "make_reservation":
        return "restaurant";
      case "general_inquiry":
      case "get_information":
        return "general_query";
      default:
        return "custom";
    }
  }

  /**
   * Manual intent extraction when all else fails
   */
  manualIntentExtraction(text) {
    const lowerText = text.toLowerCase();

    let intent = "general_inquiry";
    let confidence = 0.6;
    let workflow_type = "general_query";

    // Intent detection patterns
    if (
      lowerText.includes("book") ||
      lowerText.includes("appointment") ||
      lowerText.includes("schedule")
    ) {
      intent = "book_appointment";
      workflow_type = "appointment";
      confidence = 0.7;
    } else if (
      lowerText.includes("restaurant") ||
      lowerText.includes("reservation") ||
      lowerText.includes("table")
    ) {
      intent = "find_restaurant";
      workflow_type = "restaurant";
      confidence = 0.7;
    } else if (lowerText.includes("cancel")) {
      intent = "cancel_booking";
      workflow_type = "custom";
      confidence = 0.8;
    }

    // Basic entity extraction
    const entities = {};

    // Extract phone numbers
    const phoneMatch = text.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/);
    if (phoneMatch) entities.phone = phoneMatch[0];

    // Extract email
    const emailMatch = text.match(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
    );
    if (emailMatch) entities.email = emailMatch[0];

    logger.info(
      `🔧 Manual intent extraction completed at 2025-06-20 12:23:20:`,
      {
        intent,
        confidence,
        workflow_type,
        entitiesFound: Object.keys(entities).length,
        currentUser: "ayush20244048",
      }
    );

    return {
      intent,
      confidence,
      entities,
      workflow_type,
      suggested_actions: [`process_${workflow_type}_request`],
      context_updates: {},
      extraction_method: "manual",
      timestamp: "2025-06-20 12:23:20",
    };
  }

  /**
   * Get fallback response for different task types
   */
  getFallbackResponse(task) {
    switch (task) {
      case "intent_parsing":
        return {
          intent: "general_inquiry",
          confidence: 0.4,
          entities: {},
          workflow_type: "general_query",
          suggested_actions: ["process_general_request"],
          context_updates: {},
          fallback: true,
          timestamp: "2025-06-20 12:23:20",
        };

      case "entity_extraction":
        return {};

      case "text_generation":
        return "I understand you need assistance. Could you please provide more details about what you're looking for?";

      case "analysis":
        return {
          sentiment: "neutral",
          confidence: 0.5,
          themes: [],
          fallback: true,
          timestamp: "2025-06-20 12:23:20",
        };

      default:
        return {
          success: false,
          error: "Unable to process request",
          fallback: true,
          timestamp: "2025-06-20 12:23:20",
        };
    }
  }

  buildIntentParsingPrompt(userInput, context = "") {
    return `
IMPORTANT: You must respond with ONLY a valid JSON object. No explanations, no markdown formatting, no code blocks.

Analyze this user request:
User Input: "${userInput}"
${context ? `Context: ${context}` : ""}

Respond with this exact JSON structure:
{"intent":"book_appointment","confidence":0.95,"entities":{"service_type":"dentist","location":"downtown"},"workflow_type":"appointment","suggested_actions":["search_providers"],"context_updates":{}}

Valid intents: book_appointment, find_restaurant, make_reservation, general_inquiry, modify_booking, cancel_booking
Valid workflow_types: appointment, restaurant, general_query, custom

Current time: 2025-06-20 12:23:20 UTC
Current user: ayush20244048

JSON Response:
    `;
  }

  buildTextGenerationPrompt(request, context = "") {
    return `
Generate a helpful response for: ${request}
${context ? `Context: ${context}` : ""}

Be conversational and helpful. Provide only the response text, no JSON formatting.

Current time: 2025-06-20 12:23:20 UTC
Current user: ayush20244048

Response:
    `;
  }

  buildAnalysisPrompt(content, context = "") {
    return `
IMPORTANT: Respond with ONLY a valid JSON object. No markdown formatting.

Analyze this content: ${content}
${context ? `Context: ${context}` : ""}

Respond with this exact JSON structure:
{"sentiment":"positive","confidence":0.85,"emotional_indicators":["happy"],"tone":"friendly","urgency_level":3,"key_topics":["help"],"satisfaction_indicators":{"positive":["good"],"negative":[]}}

Current time: 2025-06-20 12:23:20 UTC
Current user: ayush20244048

JSON Response:
    `;
  }

  buildEntityExtractionPrompt(text, context = "") {
    return `
IMPORTANT: Respond with ONLY a valid JSON object. No markdown formatting.

Extract entities from: "${text}"
${context ? `Context: ${context}` : ""}

Respond with this exact JSON structure:
{"people":[],"places":["New York"],"organizations":[],"dates_times":["tomorrow"],"services":["dental"],"contact_info":{"phones":[],"emails":[]},"preferences":[],"amounts":[]}

Current time: 2025-06-20 12:23:20 UTC
Current user: ayush20244048

JSON Response:
    `;
  }

  estimateTokens(text) {
    return Math.ceil((text || "").length / 4);
  }
}

export default GeminiTool;
