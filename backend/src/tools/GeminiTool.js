/**
 * Gemini Tool - Fixed JSON Response Parsing
 * Current Date and Time: 2025-06-20 12:20:14 UTC
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
      
      Input should be a JSON string with:
      {
        "task": "intent_parsing|text_generation|analysis",
        "prompt": "The main prompt text",
        "context": "Additional context (optional)",
        "parameters": {
          "temperature": 0.7,
          "maxTokens": 1000
        }
      }
    `;
    this.model = createGeminiModel();
  }

  async _call(input) {
    try {
      logger.info(`🤖 Gemini tool called at 2025-06-20 12:20:14`, {
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

      logger.debug(`🚀 Sending to Gemini at 2025-06-20 12:20:14:`, {
        task,
        promptLength: fullPrompt.length,
        currentUser: "ayush20244048",
      });

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      let rawText = response.text();

      logger.debug(`📥 Raw Gemini response at 2025-06-20 12:20:14:`, {
        rawTextLength: rawText?.length,
        rawTextPreview: rawText?.substring(0, 200),
        task,
        currentUser: "ayush20244048",
      });

      // FIXED: Clean and parse the response properly
      const cleanedResponse = this.cleanAndParseResponse(rawText, task);

      logger.info(`✅ Gemini tool completed at 2025-06-20 12:20:14:`, {
        task,
        success: true,
        responseLength:
          typeof cleanedResponse === "string"
            ? cleanedResponse.length
            : JSON.stringify(cleanedResponse).length,
        currentUser: "ayush20244048",
      });

      return JSON.stringify({
        success: true,
        task,
        result: cleanedResponse,
        metadata: {
          timestamp: "2025-06-20 12:20:14",
          tokensUsed: this.estimateTokens(fullPrompt + rawText),
          currentUser: "ayush20244048",
        },
      });
    } catch (error) {
      logger.error(`❌ Gemini tool error at 2025-06-20 12:20:14:`, {
        error: error.message,
        stack: error.stack,
        currentUser: "ayush20244048",
      });

      return JSON.stringify({
        success: false,
        error: error.message,
        timestamp: "2025-06-20 12:20:14",
        currentUser: "ayush20244048",
      });
    }
  }

  /**
   * Clean and parse Gemini response - FIXED: Handle various response formats
   */
  cleanAndParseResponse(rawText, task) {
    if (!rawText || typeof rawText !== "string") {
      logger.warn(`⚠️ Invalid rawText at 2025-06-20 12:20:14:`, {
        rawText,
        type: typeof rawText,
        currentUser: "ayush20244048",
      });
      return this.getFallbackResponse(task);
    }

    try {
      // Remove common markdown formatting
      let cleanText = rawText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/gi, "")
        .replace(/^\s*```[\s\S]*?```\s*/gm, "")
        .trim();

      logger.debug(`🧹 Cleaned text at 2025-06-20 12:20:14:`, {
        originalLength: rawText.length,
        cleanedLength: cleanText.length,
        cleanedPreview: cleanText.substring(0, 200),
        currentUser: "ayush20244048",
      });

      // For structured tasks, try to extract JSON
      if (
        task === "intent_parsing" ||
        task === "analysis" ||
        task === "entity_extraction"
      ) {
        return this.extractStructuredResponse(cleanText, task);
      }

      // For text generation, return the cleaned text directly
      if (task === "text_generation") {
        return this.extractTextResponse(cleanText);
      }

      // Default: try to parse as JSON, fallback to text
      try {
        return JSON.parse(cleanText);
      } catch (jsonError) {
        logger.debug(
          `📝 Returning as text at 2025-06-20 12:20:14 (JSON parse failed):`,
          {
            error: jsonError.message,
            currentUser: "ayush20244048",
          }
        );
        return cleanText;
      }
    } catch (error) {
      logger.error(`❌ Response cleaning failed at 2025-06-20 12:20:14:`, {
        error: error.message,
        task,
        currentUser: "ayush20244048",
      });
      return this.getFallbackResponse(task);
    }
  }

  /**
   * Extract structured response for intent parsing and analysis
   */
  extractStructuredResponse(text, task) {
    try {
      // Look for JSON object in the text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        logger.debug(`🔍 Found JSON match at 2025-06-20 12:20:14:`, {
          jsonStr: jsonStr.substring(0, 200),
          currentUser: "ayush20244048",
        });

        try {
          return JSON.parse(jsonStr);
        } catch (parseError) {
          logger.warn(`⚠️ JSON parse error at 2025-06-20 12:20:14:`, {
            error: parseError.message,
            jsonStr: jsonStr.substring(0, 100),
            currentUser: "ayush20244048",
          });
        }
      }

      // If no JSON found, try to manually extract for intent parsing
      if (task === "intent_parsing") {
        return this.manualIntentExtraction(text);
      }

      // Fallback to default response
      return this.getFallbackResponse(task);
    } catch (error) {
      logger.error(`❌ Structured extraction failed at 2025-06-20 12:20:14:`, {
        error: error.message,
        task,
        currentUser: "ayush20244048",
      });
      return this.getFallbackResponse(task);
    }
  }

  /**
   * Extract text response for generation tasks
   */
  extractTextResponse(text) {
    // Remove any remaining JSON artifacts
    let cleanText = text
      .replace(/^Response:\s*/i, "")
      .replace(/^Generated text:\s*/i, "")
      .replace(/^Answer:\s*/i, "")
      .replace(/^Here is.*?:\s*/i, "")
      .trim();

    // If it looks like JSON, try to extract the response field
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

    return (
      cleanText ||
      "I understand you need help. Could you please provide more details?"
    );
  }

  /**
   * Manual intent extraction when JSON parsing fails
   */
  manualIntentExtraction(text) {
    const lowerText = text.toLowerCase();

    // Try to extract intent manually
    let intent = "general_inquiry";
    if (lowerText.includes("book") || lowerText.includes("appointment")) {
      intent = "book_appointment";
    } else if (
      lowerText.includes("restaurant") ||
      lowerText.includes("reservation")
    ) {
      intent = "find_restaurant";
    } else if (lowerText.includes("cancel")) {
      intent = "cancel_booking";
    }

    // Try to extract confidence
    let confidence = 0.6;
    const confMatch = text.match(/confidence["\s:]*(\d*\.?\d+)/i);
    if (confMatch) {
      confidence = Math.min(1, Math.max(0, parseFloat(confMatch[1])));
    }

    // Determine workflow type
    let workflow_type = "general_query";
    if (intent === "book_appointment") workflow_type = "appointment";
    else if (intent === "find_restaurant") workflow_type = "restaurant";

    logger.info(`🔧 Manual intent extraction at 2025-06-20 12:20:14:`, {
      intent,
      confidence,
      workflow_type,
      currentUser: "ayush20244048",
    });

    return {
      intent,
      confidence,
      entities: {},
      workflow_type,
      suggested_actions: [`process_${workflow_type}_request`],
      context_updates: {},
      extraction_method: "manual",
      timestamp: "2025-06-20 12:20:14",
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
          timestamp: "2025-06-20 12:20:14",
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
          timestamp: "2025-06-20 12:20:14",
        };

      default:
        return {
          success: false,
          error: "Unable to process request",
          fallback: true,
          timestamp: "2025-06-20 12:20:14",
        };
    }
  }

  buildIntentParsingPrompt(userInput, context = "") {
    return `
You are an AI assistant that analyzes user requests and extracts intent and entities.

User Input: "${userInput}"
${context ? `Additional Context: ${context}` : ""}

Analyze this request and respond with ONLY a valid JSON object (no markdown, no explanations):

{
  "intent": "book_appointment|find_restaurant|make_reservation|general_inquiry|modify_booking|cancel_booking",
  "confidence": 0.95,
  "entities": {
    "service_type": "type of service requested",
    "location": "any location mentioned", 
    "date_time": "any date or time mentioned",
    "preferences": "user preferences or requirements",
    "contact_info": {
      "name": "person name if mentioned",
      "phone": "phone number if mentioned",
      "email": "email if mentioned"
    },
    "party_size": "number of people if mentioned",
    "cuisine_type": "food type if restaurant related"
  },
  "workflow_type": "appointment|restaurant|general_query|custom",
  "suggested_actions": ["next_steps_for_system"],
  "context_updates": {}
}

IMPORTANT: 
- Return ONLY the JSON object
- No markdown formatting
- No explanations before or after
- Ensure all fields are present
- Use appropriate intent based on user request
- Extract entities that are clearly mentioned in the input

Current time: 2025-06-20 12:20:14 UTC
Current user: ayush20244048
    `;
  }

  buildTextGenerationPrompt(request, context = "") {
    return `
Generate a helpful, natural response for this user request:

User Request: ${request}
${context ? `Context: ${context}` : ""}

Requirements:
- Be conversational and friendly
- Provide specific, actionable information
- Ask clarifying questions if needed
- Be concise but informative
- Don't use JSON format - just provide the response text

Current time: 2025-06-20 12:20:14 UTC
Current user: ayush20244048

Response:
    `;
  }

  buildAnalysisPrompt(content, context = "") {
    return `
Analyze the following content and return ONLY a valid JSON object:

Content: ${content}
${context ? `Context: ${context}` : ""}

Return ONLY this JSON structure (no markdown, no explanations):

{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.95,
  "emotional_indicators": ["list", "of", "emotions"],
  "tone": "formal|casual|urgent|friendly",
  "urgency_level": 5,
  "key_topics": ["main", "topics"],
  "satisfaction_indicators": {
    "positive": ["positive_words_found"],
    "negative": ["negative_words_found"]
  }
}

Current time: 2025-06-20 12:20:14 UTC
Current user: ayush20244048
    `;
  }

  buildEntityExtractionPrompt(text, context = "") {
    return `
Extract entities from this text and return ONLY a valid JSON object:

Text: "${text}"
${context ? `Context: ${context}` : ""}

Return ONLY this JSON structure (no markdown, no explanations):

{
  "people": ["names of people mentioned"],
  "places": ["locations, addresses, cities"],
  "organizations": ["companies, businesses"],
  "dates_times": ["date and time mentions"],
  "services": ["services or products mentioned"],
  "contact_info": {
    "phones": ["phone numbers"],
    "emails": ["email addresses"]
  },
  "preferences": ["user preferences"],
  "amounts": ["prices, quantities"]
}

Current time: 2025-06-20 12:20:14 UTC
Current user: ayush20244048
    `;
  }

  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil((text || "").length / 4);
  }
}

export default GeminiTool;
