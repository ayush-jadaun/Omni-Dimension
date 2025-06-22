import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';
import dotenv from "dotenv"

dotenv.config()
// Validate API key
const GEMINI_API_KEY =
  process.env.GOOGLE_GEMINI_API_KEY 
if (!GEMINI_API_KEY) {
  throw new Error('GOOGLE_GEMINI_API_KEY is required');
}

// Initialize Google Generative AI
export const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// LangChain ChatGoogleGenerativeAI configuration
export const geminiConfig = {
  apiKey: GEMINI_API_KEY,
  modelName: 'gemini-2.0-flash',
  temperature: 0.7,
  topP: 0.8,
  topK: 40,
  maxOutputTokens: 2048,
  safetySettings: [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE'
    }
  ]
};

// Create LangChain Gemini instance
export const createGeminiLLM = (config = {}) => {
  try {
    return new ChatGoogleGenerativeAI({
      ...geminiConfig,
      ...config
    });
  } catch (error) {
    logger.error('Failed to create Gemini LLM instance:', error);
    throw error;
  }
};

// Direct Gemini model for specific use cases
export const createGeminiModel = (modelName = 'gemini-2.0-flash-exp') => {
  try {
    return genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: geminiConfig.temperature,
        topP: geminiConfig.topP,
        topK: geminiConfig.topK,
        maxOutputTokens: geminiConfig.maxOutputTokens
      },
      safetySettings: geminiConfig.safetySettings
    });
  } catch (error) {
    logger.error('Failed to create Gemini model:', error);
    throw error;
  }
};

// Test Gemini connection
export const testGeminiConnection = async () => {
  try {
    const model = createGeminiModel();
    const result = await model.generateContent('Hello, this is a connection test.');
    const response = await result.response;
    const text = response.text();
    
    logger.info('Gemini connection test successful');
    return { success: true, message: text };
    
  } catch (error) {
    logger.error('Gemini connection test failed:', error);
    return { success: false, error: error.message };
  }
};

// LangChain configuration constants
export const LANGCHAIN_CONFIG = {
  verbose: process.env.NODE_ENV === 'development',
  temperature: 0.7,
  maxTokens: 2048,
  streaming: true,
  callbacks: []
};

logger.info('LangChain configuration initialized successfully');