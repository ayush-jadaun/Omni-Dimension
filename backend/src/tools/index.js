import GeminiTool from './GeminiTool.js';
import SearchTool from './SearchTool.js';
import CalendarTool from './CalendarTool.js';
import MonitoringTool from './MonitoringTool.js';

export {
  GeminiTool,
  SearchTool,
  CalendarTool,
  MonitoringTool
};

export const createToolsForAgent = (agentType) => {
  const commonTools = [new MonitoringTool()];
  
  switch (agentType) {
    case 'nlp':
      return [...commonTools, new GeminiTool()];
    
    case 'search':
      return [...commonTools, new SearchTool(), new GeminiTool()];
    
    case 'omnidimension':
      return [...commonTools, new CalendarTool(), new GeminiTool()];
    
    case 'orchestrator':
      return [...commonTools, new GeminiTool(), new SearchTool(), new CalendarTool()];
    
    case 'monitoring':
      return [...commonTools];
    
    default:
      return commonTools;
  }
};

export default {
  GeminiTool,
  SearchTool,
  CalendarTool,
  MonitoringTool,
  createToolsForAgent
};