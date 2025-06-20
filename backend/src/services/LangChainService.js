import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { createGeminiLLM } from '../config/langchain.js';
import { logger } from '../utils/logger.js';

export class LangChainService {
  constructor() {
    this.llm = createGeminiLLM();
    this.parser = new StringOutputParser();
    this.conversationHistory = new Map();
  }

  async generateResponse(prompt, context = {}, options = {}) {
    try {
      const {
        temperature = 0.7,
        maxTokens = 1000,
        systemPrompt,
        conversationId,
        streaming = false
      } = options;

      // Configure LLM for this request
      const llm = createGeminiLLM({
        temperature,
        maxOutputTokens: maxTokens
      });

      // Build messages array
      const messages = [];

      if (systemPrompt) {
        messages.push(new SystemMessage(systemPrompt));
      }

      // Add conversation history if available
      if (conversationId && this.conversationHistory.has(conversationId)) {
        const history = this.conversationHistory.get(conversationId);
        messages.push(...history.slice(-10)); // Last 10 messages for context
      }

      // Add current prompt
      messages.push(new HumanMessage(prompt));

      let response;
      if (streaming) {
        response = await this.streamResponse(llm, messages);
      } else {
        response = await llm.invoke(messages);
      }

      // Store in conversation history
      if (conversationId) {
        this.updateConversationHistory(conversationId, prompt, response.content);
      }

      return {
        success: true,
        response: response.content,
        metadata: {
          tokensUsed: this.estimateTokens(prompt + response.content),
          model: 'gemini-2.0-flash-exp',
          temperature,
          conversationId
        }
      };

    } catch (error) {
      logger.error('LangChain generation error:', error);
      throw new Error(`Response generation failed: ${error.message}`);
    }
  }

  async streamResponse(llm, messages) {
    try {
      const stream = await llm.stream(messages);
      let fullResponse = '';
      
      for await (const chunk of stream) {
        fullResponse += chunk.content;
        // Emit chunk for real-time streaming (could integrate with WebSocket)
      }

      return { content: fullResponse };
    } catch (error) {
      logger.error('Streaming error:', error);
      throw error;
    }
  }

  async classifyIntent(text, possibleIntents = []) {
    try {
      const intentPrompt = PromptTemplate.fromTemplate(`
        Classify the following text into one of these intents: {intents}
        
        Text: {text}
        
        Return a JSON object with:
        {{
          "intent": "most_likely_intent",
          "confidence": 0.95,
          "reasoning": "brief explanation"
        }}
      `);

      const chain = RunnableSequence.from([
        intentPrompt,
        this.llm,
        this.parser
      ]);

      const result = await chain.invoke({
        text,
        intents: possibleIntents.join(', ')
      });

      return JSON.parse(result);

    } catch (error) {
      logger.error('Intent classification error:', error);
      return {
        intent: 'unknown',
        confidence: 0.1,
        reasoning: 'Classification failed'
      };
    }
  }

  async extractEntities(text, entityTypes = []) {
    try {
      const entityPrompt = PromptTemplate.fromTemplate(`
        Extract entities from the following text.
        Focus on these entity types: {entityTypes}
        
        Text: {text}
        
        Return a JSON object with extracted entities:
        {{
          "entities": {{
            "dates": [],
            "locations": [],
            "names": [],
            "phone_numbers": [],
            "emails": [],
            "services": [],
            "preferences": []
          }}
        }}
      `);

      const chain = RunnableSequence.from([
        entityPrompt,
        this.llm,
        this.parser
      ]);

      const result = await chain.invoke({
        text,
        entityTypes: entityTypes.join(', ')
      });

      return JSON.parse(result);

    } catch (error) {
      logger.error('Entity extraction error:', error);
      return { entities: {} };
    }
  }

  async summarizeConversation(messages, maxLength = 200) {
    try {
      const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const summaryPrompt = PromptTemplate.fromTemplate(`
        Summarize this conversation in {maxLength} characters or less:
        
        {conversation}
        
        Focus on:
        - Main topics discussed
        - Key decisions or outcomes
        - Outstanding tasks or next steps
        
        Summary:
      `);

      const chain = RunnableSequence.from([
        summaryPrompt,
        this.llm,
        this.parser
      ]);

      const summary = await chain.invoke({
        conversation: conversationText,
        maxLength
      });

      return summary.substring(0, maxLength);

    } catch (error) {
      logger.error('Conversation summary error:', error);
      return 'Unable to generate summary';
    }
  }

  async generateFollowUpQuestions(context, count = 3) {
    try {
      const questionPrompt = PromptTemplate.fromTemplate(`
        Based on this context, generate {count} relevant follow-up questions:
        
        Context: {context}
        
        Generate questions that would help clarify the user's needs or gather missing information.
        Return as a JSON array: ["question1", "question2", "question3"]
      `);

      const chain = RunnableSequence.from([
        questionPrompt,
        this.llm,
        this.parser
      ]);

      const result = await chain.invoke({
        context: JSON.stringify(context),
        count
      });

      return JSON.parse(result);

    } catch (error) {
      logger.error('Follow-up questions generation error:', error);
      return [];
    }
  }

  updateConversationHistory(conversationId, userMessage, aiResponse) {
    if (!this.conversationHistory.has(conversationId)) {
      this.conversationHistory.set(conversationId, []);
    }

    const history = this.conversationHistory.get(conversationId);
    history.push(new HumanMessage(userMessage));
    history.push(new AIMessage(aiResponse));

    // Keep only last 20 messages to manage memory
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    this.conversationHistory.set(conversationId, history);
  }

  clearConversationHistory(conversationId) {
    this.conversationHistory.delete(conversationId);
  }

  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English
    return Math.ceil(text.length / 4);
  }

  async testConnection() {
    try {
      const response = await this.generateResponse('Hello, this is a connection test.');
      return response.success;
    } catch (error) {
      logger.error('LangChain connection test failed:', error);
      return false;
    }
  }
}

export default new LangChainService();