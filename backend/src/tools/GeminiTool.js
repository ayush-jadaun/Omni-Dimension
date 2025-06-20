import { Tool } from '@langchain/core/tools';
import { createGeminiModel } from '../config/langchain.js';
import { logger } from '../utils/logger.js';

export class GeminiTool extends Tool {
  constructor() {
    super();
    this.name = 'gemini_llm';
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
      const { task, prompt, context, parameters = {} } = JSON.parse(input);
      
      let fullPrompt = '';
      
      switch (task) {
        case 'intent_parsing':
          fullPrompt = this.buildIntentParsingPrompt(prompt, context);
          break;
        case 'text_generation':
          fullPrompt = this.buildTextGenerationPrompt(prompt, context);
          break;
        case 'analysis':
          fullPrompt = this.buildAnalysisPrompt(prompt, context);
          break;
        case 'entity_extraction':
          fullPrompt = this.buildEntityExtractionPrompt(prompt, context);
          break;
        default:
          fullPrompt = prompt;
      }

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      logger.debug('Gemini tool executed', { task, promptLength: prompt.length });

      return JSON.stringify({
        success: true,
        task,
        result: text,
        metadata: {
          timestamp: new Date().toISOString(),
          tokensUsed: this.estimateTokens(fullPrompt + text)
        }
      });

    } catch (error) {
      logger.error('Gemini tool error:', error);
      return JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  buildIntentParsingPrompt(userInput, context = '') {
    return `
Analyze the following user request and extract the intent and entities:

User Input: "${userInput}"
${context ? `Context: ${context}` : ''}

Return a JSON response with:
{
  "intent": "main_action_type",
  "confidence": 0.95,
  "entities": {
    "service_type": "extracted_service",
    "location": "extracted_location", 
    "date_time": "extracted_datetime",
    "preferences": ["extracted_preferences"],
    "contact_info": {
      "name": "user_name",
      "phone": "phone_number",
      "email": "email_address"
    }
  },
  "suggested_actions": ["list_of_next_steps"],
  "workflow_type": "appointment|restaurant|custom|general_query"
}

Common intents include:
- book_appointment (dental, medical, beauty, etc.)
- find_restaurant (reservation, delivery, takeout)
- general_inquiry (questions, information requests)
- schedule_meeting (business, personal)
- cancel_booking (existing appointments)
- modify_booking (change time, date, details)

Be specific about the service type and extract all relevant details.
    `;
  }

  buildTextGenerationPrompt(request, context = '') {
    return `
Generate a natural, helpful response for the user based on:

Request: ${request}
${context ? `Context: ${context}` : ''}

Requirements:
- Be conversational and friendly
- Provide specific, actionable information
- Ask clarifying questions if needed
- Maintain context of the conversation
- Be concise but informative

Response:
    `;
  }

  buildAnalysisPrompt(content, context = '') {
    return `
Analyze the following content and provide insights:

Content: ${content}
${context ? `Context: ${context}` : ''}

Provide analysis including:
- Main topics and themes
- Sentiment and tone
- Key information extracted
- Confidence level of analysis
- Suggestions for next steps

Return as JSON format with structured analysis.
    `;
  }

  buildEntityExtractionPrompt(text, context = '') {
    return `
Extract all relevant entities from this text:

Text: "${text}"
${context ? `Context: ${context}` : ''}

Return JSON with extracted entities:
{
  "people": ["names of people"],
  "places": ["locations, addresses, cities"],
  "organizations": ["companies, businesses"],
  "dates_times": ["date and time mentions"],
  "services": ["services or products mentioned"],
  "contact_info": {
    "phones": ["phone numbers"],
    "emails": ["email addresses"]
  },
  "preferences": ["user preferences or requirements"],
  "amounts": ["prices, quantities, numbers"]
}

Be thorough and accurate in extraction.
    `;
  }

  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

export default GeminiTool;