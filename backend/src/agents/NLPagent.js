import BaseAgent from './BaseAgent.js';
import { AGENT_TYPES } from '../config/constants.js';
import { logger } from '../utils/logger.js';

export class NLPAgent extends BaseAgent {
  constructor() {
    const capabilities = [
      'intent_parsing',
      'entity_extraction', 
      'text_generation',
      'sentiment_analysis',
      'language_understanding',
      'conversation_context'
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
    `;

    super(AGENT_TYPES.NLP, capabilities, systemPrompt);
  }

  async executeTask(taskId, taskData) {
    logger.info(`NLP Agent executing task: ${taskId}`, taskData);

    try {
      switch (taskData.action) {
        case 'parse_intent':
          return await this.parseIntent(taskData);
        case 'extract_entities':
          return await this.extractEntities(taskData);
        case 'text_generation':
          return await this.generateText(taskData);
        case 'sentiment_analysis':
          return await this.analyzeSentiment(taskData);
        case 'context_analysis':
          return await this.analyzeContext(taskData);
        case 'conversation_summary':
          return await this.summarizeConversation(taskData);
        default:
          return await super.executeTask(taskId, taskData);
      }
    } catch (error) {
      logger.error(`NLP Agent task execution failed:`, error);
      throw error;
    }
  }

  async parseIntent(taskData) {
    const { text, context = {} } = taskData;
    
    logger.info('Parsing intent for text:', text);

    // Use Gemini tool for intent parsing
    const geminiTool = this.tools.find(tool => tool.name === 'gemini_llm');
    
    const analysisInput = JSON.stringify({
      task: 'intent_parsing',
      prompt: text,
      context: JSON.stringify(context),
      parameters: {
        temperature: 0.3, // Lower temperature for more consistent analysis
        maxTokens: 1000
      }
    });

    const result = await geminiTool._call(analysisInput);
    const parsedResult = JSON.parse(result);

    if (!parsedResult.success) {
      throw new Error(`Intent parsing failed: ${parsedResult.error}`);
    }

    let analysis;
    try {
      analysis = JSON.parse(parsedResult.result);
    } catch (error) {
      // Fallback: Parse manually if JSON parsing fails
      analysis = this.parseIntentFallback(text, context);
    }

    // Validate and enhance analysis
    analysis = this.validateAndEnhanceAnalysis(analysis, text, context);

    logger.info('Intent analysis completed:', {
      intent: analysis.intent,
      confidence: analysis.confidence,
      workflowType: analysis.workflow_type
    });

    return {
      success: true,
      result: analysis,
      metadata: {
        processingTime: Date.now(),
        agentType: 'nlp',
        confidence: analysis.confidence
      }
    };
  }

  async extractEntities(taskData) {
    const { text, entityTypes = [], context = {} } = taskData;
    
    logger.info('Extracting entities from text:', text);

    const geminiTool = this.tools.find(tool => tool.name === 'gemini_llm');
    
    const extractionInput = JSON.stringify({
      task: 'entity_extraction',
      prompt: text,
      context: JSON.stringify({
        ...context,
        requested_entity_types: entityTypes
      }),
      parameters: {
        temperature: 0.2,
        maxTokens: 800
      }
    });

    const result = await geminiTool._call(extractionInput);
    const parsedResult = JSON.parse(result);

    if (!parsedResult.success) {
      throw new Error(`Entity extraction failed: ${parsedResult.error}`);
    }

    let entities;
    try {
      entities = JSON.parse(parsedResult.result);
    } catch (error) {
      entities = this.extractEntitiesFallback(text, entityTypes);
    }

    // Post-process and validate entities
    entities = this.postProcessEntities(entities, text);

    return {
      success: true,
      result: entities,
      metadata: {
        processingTime: Date.now(),
        entityCount: Object.keys(entities).length
      }
    };
  }

  async generateText(taskData) {
    const { prompt, context = {}, task = 'general', parameters = {} } = taskData;
    
    logger.info('Generating text response');

    const geminiTool = this.tools.find(tool => tool.name === 'gemini_llm');
    
    const generationInput = JSON.stringify({
      task: 'text_generation',
      prompt: prompt,
      context: JSON.stringify(context),
      parameters: {
        temperature: parameters.temperature || 0.7,
        maxTokens: parameters.maxTokens || 1000
      }
    });

    const result = await geminiTool._call(generationInput);
    const parsedResult = JSON.parse(result);

    if (!parsedResult.success) {
      throw new Error(`Text generation failed: ${parsedResult.error}`);
    }

    // Post-process the generated text
    const generatedText = this.postProcessGeneratedText(parsedResult.result, task);

    return {
      success: true,
      result: generatedText,
      metadata: {
        processingTime: Date.now(),
        textLength: generatedText.length,
        task: task
      }
    };
  }

  async analyzeSentiment(taskData) {
    const { text, context = {} } = taskData;
    
    logger.info('Analyzing sentiment');

    const geminiTool = this.tools.find(tool => tool.name === 'gemini_llm');
    
    const sentimentPrompt = `
    Analyze the sentiment and emotional tone of this text:
    
    Text: "${text}"
    Context: ${JSON.stringify(context)}
    
    Return a JSON response with:
    {
      "sentiment": "positive|negative|neutral",
      "confidence": 0.95,
      "emotional_indicators": ["excited", "frustrated", "urgent"],
      "tone": "formal|casual|urgent|friendly",
      "urgency_level": 1-10,
      "satisfaction_indicators": {
        "positive": ["pleased", "satisfied"],
        "negative": ["frustrated", "disappointed"]
      }
    }
    `;

    const analysisInput = JSON.stringify({
      task: 'analysis',
      prompt: sentimentPrompt,
      parameters: {
        temperature: 0.3,
        maxTokens: 500
      }
    });

    const result = await geminiTool._call(analysisInput);
    const parsedResult = JSON.parse(result);

    if (!parsedResult.success) {
      throw new Error(`Sentiment analysis failed: ${parsedResult.error}`);
    }

    let sentiment;
    try {
      sentiment = JSON.parse(parsedResult.result);
    } catch (error) {
      sentiment = this.analyzeSentimentFallback(text);
    }

    return {
      success: true,
      result: sentiment,
      metadata: {
        processingTime: Date.now(),
        confidence: sentiment.confidence
      }
    };
  }

  async analyzeContext(taskData) {
    const { currentMessage, conversationHistory = [], userProfile = {} } = taskData;
    
    logger.info('Analyzing conversation context');

    // Build context analysis
    const contextAnalysis = {
      current_intent: await this.extractQuickIntent(currentMessage),
      conversation_flow: this.analyzeConversationFlow(conversationHistory),
      user_preferences: this.extractUserPreferences(conversationHistory, userProfile),
      missing_information: this.identifyMissingInformation(currentMessage, conversationHistory),
      suggested_clarifications: this.generateClarificationQuestions(currentMessage, conversationHistory),
      context_continuity: this.assessContextContinuity(conversationHistory)
    };

    return {
      success: true,
      result: contextAnalysis,
      metadata: {
        processingTime: Date.now(),
        conversationLength: conversationHistory.length
      }
    };
  }

  async summarizeConversation(taskData) {
    const { messages, maxLength = 200 } = taskData;
    
    logger.info('Summarizing conversation');

    const conversationText = messages
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const geminiTool = this.tools.find(tool => tool.name === 'gemini_llm');
    
    const summaryPrompt = `
    Summarize this conversation in ${maxLength} characters or less. Focus on:
    - Main user requests and intents
    - Key information provided
    - Current status/progress
    - Outstanding tasks or next steps
    
    Conversation:
    ${conversationText}
    
    Provide a concise, informative summary.
    `;

    const summaryInput = JSON.stringify({
      task: 'text_generation',
      prompt: summaryPrompt,
      parameters: {
        temperature: 0.5,
        maxTokens: Math.ceil(maxLength / 3) // Rough token estimation
      }
    });

    const result = await geminiTool._call(summaryInput);
    const parsedResult = JSON.parse(result);

    if (!parsedResult.success) {
      throw new Error(`Conversation summary failed: ${parsedResult.error}`);
    }

    const summary = parsedResult.result.substring(0, maxLength);

    return {
      success: true,
      result: {
        summary,
        messageCount: messages.length,
        keyTopics: this.extractKeyTopics(messages)
      },
      metadata: {
        processingTime: Date.now(),
        originalLength: conversationText.length,
        summaryLength: summary.length
      }
    };
  }

  // Helper methods for fallback processing
  parseIntentFallback(text, context) {
    const lowercaseText = text.toLowerCase();
    
    // Simple rule-based intent detection
    let intent = 'general_inquiry';
    let confidence = 0.6;
    let workflow_type = 'general_query';

    if (lowercaseText.includes('book') || lowercaseText.includes('appointment') || lowercaseText.includes('schedule')) {
      intent = 'book_appointment';
      workflow_type = 'appointment';
      confidence = 0.8;
    } else if (lowercaseText.includes('restaurant') || lowercaseText.includes('reserve') || lowercaseText.includes('dinner')) {
      intent = 'find_restaurant';
      workflow_type = 'restaurant';
      confidence = 0.8;
    } else if (lowercaseText.includes('cancel') || lowercaseText.includes('change')) {
      intent = 'modify_booking';
      workflow_type = 'custom';
      confidence = 0.7;
    }

    return {
      intent,
      confidence,
      entities: this.extractEntitiesFallback(text, []),
      workflow_type,
      suggested_actions: [`process_${workflow_type}_request`]
    };
  }

  extractEntitiesFallback(text, entityTypes) {
    const entities = {};
    
    // Simple regex-based entity extraction
    const patterns = {
      phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      date: /\b(?:tomorrow|today|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/gi,
      time: /\b(?:\d{1,2}:\d{2}\s?(?:am|pm|AM|PM)|\d{1,2}\s?(?:am|pm|AM|PM))\b/g
    };

    Object.entries(patterns).forEach(([type, pattern]) => {
      const matches = text.match(pattern);
      if (matches) {
        entities[type] = matches;
      }
    });

    return entities;
  }

  validateAndEnhanceAnalysis(analysis, originalText, context) {
    // Ensure required fields exist
    if (!analysis.intent) analysis.intent = 'general_inquiry';
    if (!analysis.confidence) analysis.confidence = 0.5;
    if (!analysis.entities) analysis.entities = {};
    if (!analysis.workflow_type) analysis.workflow_type = 'general_query';
    if (!analysis.suggested_actions) analysis.suggested_actions = ['process_request'];

    // Enhance with additional context
    if (context.user_location && !analysis.entities.location) {
      analysis.entities.user_location = context.user_location;
    }

    if (context.user_preferences) {
      analysis.entities.preferences = {
        ...analysis.entities.preferences,
        ...context.user_preferences
      };
    }

    // Validate confidence score
    if (analysis.confidence < 0) analysis.confidence = 0;
    if (analysis.confidence > 1) analysis.confidence = 1;

    return analysis;
  }

  postProcessEntities(entities, originalText) {
    // Clean up and validate extracted entities
    Object.keys(entities).forEach(key => {
      if (Array.isArray(entities[key])) {
        // Remove duplicates and empty values
        entities[key] = [...new Set(entities[key])].filter(item => item && item.trim());
        
        // If only one item, convert to string
        if (entities[key].length === 1) {
          entities[key] = entities[key][0];
        } else if (entities[key].length === 0) {
          delete entities[key];
        }
      } else if (typeof entities[key] === 'string') {
        entities[key] = entities[key].trim();
        if (!entities[key]) {
          delete entities[key];
        }
      }
    });

    return entities;
  }

  postProcessGeneratedText(text, task) {
    // Clean up generated text
    let cleanText = text.trim();
    
    // Remove any JSON formatting if it leaked through
    if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
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
      'Here is the response:',
      'Response:',
      'Generated text:',
      'AI:'
    ];

    prefixesToRemove.forEach(prefix => {
      if (cleanText.toLowerCase().startsWith(prefix.toLowerCase())) {
        cleanText = cleanText.substring(prefix.length).trim();
      }
    });

    return cleanText;
  }

  analyzeSentimentFallback(text) {
    const positiveWords = ['great', 'good', 'excellent', 'love', 'happy', 'pleased', 'satisfied'];
    const negativeWords = ['bad', 'terrible', 'hate', 'disappointed', 'frustrated', 'angry'];
    const urgentWords = ['urgent', 'asap', 'immediately', 'now', 'emergency'];

    const words = text.toLowerCase().split(/\s+/);
    
    let positiveCount = 0;
    let negativeCount = 0;
    let urgentCount = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
      if (urgentWords.includes(word)) urgentCount++;
    });

    let sentiment = 'neutral';
    let confidence = 0.6;

    if (positiveCount > negativeCount) {
      sentiment = 'positive';
      confidence = Math.min(0.8, 0.5 + (positiveCount / words.length));
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
      confidence = Math.min(0.8, 0.5 + (negativeCount / words.length));
    }

    return {
      sentiment,
      confidence,
      emotional_indicators: [],
      tone: urgentCount > 0 ? 'urgent' : 'casual',
      urgency_level: Math.min(10, urgentCount * 3 + (negativeCount * 2)),
      satisfaction_indicators: {
        positive: positiveWords.filter(word => words.includes(word)),
        negative: negativeWords.filter(word => words.includes(word))
      }
    };
  }

  extractQuickIntent(message) {
    // Quick intent extraction for context analysis
    const text = message.toLowerCase();
    
    if (text.includes('book') || text.includes('schedule')) return 'booking';
    if (text.includes('cancel') || text.includes('change')) return 'modification';
    if (text.includes('find') || text.includes('search')) return 'search';
    if (text.includes('help') || text.includes('how')) return 'help';
    
    return 'general';
  }

  analyzeConversationFlow(history) {
    if (history.length === 0) return { stage: 'initial', flow: 'new_conversation' };
    
    const recentMessages = history.slice(-5);
    const topics = recentMessages.map(msg => this.extractQuickIntent(msg.content));
    
    return {
      stage: history.length < 3 ? 'early' : history.length < 10 ? 'middle' : 'extended',
      flow: topics.length === new Set(topics).size ? 'diverse' : 'focused',
      dominant_topic: this.getMostFrequent(topics),
      message_count: history.length
    };
  }

  extractUserPreferences(history, profile) {
    const preferences = { ...profile };
    
    // Extract preferences from conversation history
    history.forEach(msg => {
      if (msg.role === 'user') {
        const content = msg.content.toLowerCase();
        
        // Location preferences
        if (content.includes('near') || content.includes('in ')) {
          const locationMatch = content.match(/(?:near|in)\s+([a-zA-Z\s]+)/);
          if (locationMatch) {
            preferences.preferred_location = locationMatch[1].trim();
          }
        }
        
        // Time preferences
        if (content.includes('morning')) preferences.preferred_time = 'morning';
        if (content.includes('afternoon')) preferences.preferred_time = 'afternoon';
        if (content.includes('evening')) preferences.preferred_time = 'evening';
      }
    });
    
    return preferences;
  }

  identifyMissingInformation(currentMessage, history) {
    const missing = [];
    const text = currentMessage.toLowerCase();
    
    if (text.includes('appointment') || text.includes('book')) {
      if (!text.includes('doctor') && !text.includes('dentist') && !text.includes('clinic')) {
        missing.push('service_type');
      }
      if (!this.containsDateTimeInfo(text)) {
        missing.push('preferred_time');
      }
      if (!this.containsLocationInfo(text) && !this.hasLocationInHistory(history)) {
        missing.push('location');
      }
    }
    
    return missing;
  }

  generateClarificationQuestions(currentMessage, history) {
    const missing = this.identifyMissingInformation(currentMessage, history);
    const questions = [];
    
    missing.forEach(info => {
      switch (info) {
        case 'service_type':
          questions.push('What type of appointment would you like to book?');
          break;
        case 'preferred_time':
          questions.push('When would you prefer to schedule this?');
          break;
        case 'location':
          questions.push('What location or area would you prefer?');
          break;
      }
    });
    
    return questions;
  }

  assessContextContinuity(history) {
    if (history.length < 2) return { continuity: 'new', score: 1.0 };
    
    const recentTopics = history.slice(-3).map(msg => this.extractQuickIntent(msg.content));
    const uniqueTopics = new Set(recentTopics);
    
    return {
      continuity: uniqueTopics.size === 1 ? 'focused' : uniqueTopics.size === 2 ? 'related' : 'scattered',
      score: 1 / uniqueTopics.size,
      recent_topics: Array.from(uniqueTopics)
    };
  }

  extractKeyTopics(messages) {
    const topics = new Map();
    
    messages.forEach(msg => {
      if (msg.role === 'user') {
        const intent = this.extractQuickIntent(msg.content);
        topics.set(intent, (topics.get(intent) || 0) + 1);
      }
    });
    
    return Array.from(topics.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([topic]) => topic);
  }

  containsDateTimeInfo(text) {
    const dateTimePatterns = [
      /\b(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /\b\d{1,2}[:/]\d{1,2}\b/,
      /\b\d{1,2}\s?(?:am|pm)\b/i,
      /\b(?:morning|afternoon|evening|night)\b/i,
      /\bnext\s+(?:week|month)\b/i
    ];
    
    return dateTimePatterns.some(pattern => pattern.test(text));
  }

  containsLocationInfo(text) {
    const locationPatterns = [
      /\b(?:near|in|at|around)\s+[a-zA-Z\s]+/i,
      /\b\d+\s+[a-zA-Z\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd)\b/i,
      /\b[a-zA-Z\s]+,\s*[a-zA-Z]{2}\b/
    ];
    
    return locationPatterns.some(pattern => pattern.test(text));
  }

  hasLocationInHistory(history) {
    return history.some(msg => 
      msg.role === 'user' && this.containsLocationInfo(msg.content)
    );
  }

  getMostFrequent(array) {
    const frequency = {};
    array.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    
    return Object.keys(frequency).reduce((a, b) => 
      frequency[a] > frequency[b] ? a : b
    );
  }
}

export default NLPAgent;