import OrchestratorAgent from './OrchestratorAgent.js';
import NLPAgent from './NLPagent.js';
import SearchAgent from './SearchAgent.js';
import OmniDimensionAgent from './OmniDimensionAgent.js';
import MonitoringAgent from './MonitoringAgent.js';
import { logger } from '../utils/logger.js';

// Global agent instances
let orchestratorAgent = null;
let nlpAgent = null;
let searchAgent = null;
let omniDimensionAgent = null;
let monitoringAgent = null;

export const initializeAgents = async () => {
  try {
    logger.info('🤖 Initializing all agents...');

    // Initialize agents in order of dependency
    // Monitoring agent first for system oversight
    monitoringAgent = new MonitoringAgent();
    await monitoringAgent.initialize();
    logger.info('✅ Monitoring Agent initialized');

    // Core processing agents
    nlpAgent = new NLPAgent();
    await nlpAgent.initialize();
    logger.info('✅ NLP Agent initialized');

    searchAgent = new SearchAgent();
    await searchAgent.initialize();
    logger.info('✅ Search Agent initialized');

    omniDimensionAgent = new OmniDimensionAgent();
    await omniDimensionAgent.initialize();
    logger.info('✅ OmniDimension Agent initialized');

    // Orchestrator agent last as it coordinates all others
    orchestratorAgent = new OrchestratorAgent();
    await orchestratorAgent.initialize();
    logger.info('✅ Orchestrator Agent initialized');

    logger.info('🎉 All agents initialized successfully!');
    
    // Start agent health monitoring
    startAgentHealthMonitoring();

    return {
      orchestrator: orchestratorAgent,
      nlp: nlpAgent,
      search: searchAgent,
      omnidimension: omniDimensionAgent,
      monitoring: monitoringAgent
    };

  } catch (error) {
    logger.error('❌ Failed to initialize agents:', error);
    throw error;
  }
};

export const getAgents = () => {
  return {
    orchestrator: orchestratorAgent,
    nlp: nlpAgent,
    search: searchAgent,
    omnidimension: omniDimensionAgent,
    monitoring: monitoringAgent
  };
};

export const getAgent = (agentType) => {
  const agents = getAgents();
  return agents[agentType] || null;
};

export const shutdownAgents = async () => {
  try {
    logger.info('🔄 Shutting down all agents...');

    const agents = [
      orchestratorAgent,
      omniDimensionAgent,
      searchAgent,
      nlpAgent,
      monitoringAgent
    ].filter(agent => agent !== null);

    // Shutdown agents in reverse order
    for (const agent of agents) {
      try {
        await agent.shutdown();
        logger.info(`✅ ${agent.type} agent shutdown complete`);
      } catch (error) {
        logger.error(`❌ Error shutting down ${agent.type} agent:`, error);
      }
    }

    // Clear references
    orchestratorAgent = null;
    nlpAgent = null;
    searchAgent = null;
    omniDimensionAgent = null;
    monitoringAgent = null;

    logger.info('👋 All agents shutdown complete');

  } catch (error) {
    logger.error('❌ Error during agent shutdown:', error);
    throw error;
  }
};

export const getAgentStatus = () => {
  const agents = getAgents();
  const status = {};

  Object.entries(agents).forEach(([type, agent]) => {
    if (agent) {
      status[type] = {
        id: agent.id,
        type: agent.type,
        status: agent.status,
        uptime: Date.now() - agent.startTime.getTime(),
        currentTasks: agent.currentTasks.size,
        completedTasks: agent.completedTasks,
        failedTasks: agent.failedTasks,
        capabilities: agent.capabilities,
        isAvailable: agent.isAvailable(),
        lastHeartbeat: agent.lastHeartbeat
      };
    } else {
      status[type] = {
        status: 'not_initialized',
        available: false
      };
    }
  });

  return status;
};

export const getSystemHealth = async () => {
  try {
    const agentStatus = getAgentStatus();
    const totalAgents = Object.keys(agentStatus).length;
    const activeAgents = Object.values(agentStatus).filter(s => s.status === 'active' || s.status === 'idle').length;
    
    const health = {
      overall_status: activeAgents === totalAgents ? 'healthy' : activeAgents > totalAgents / 2 ? 'degraded' : 'critical',
      agent_availability: (activeAgents / totalAgents) * 100,
      total_agents: totalAgents,
      active_agents: activeAgents,
      agents: agentStatus,
      last_check: new Date().toISOString()
    };

    // Get detailed metrics from monitoring agent if available
    if (monitoringAgent && monitoringAgent.status !== 'offline') {
      try {
        const metricsResult = await monitoringAgent.collectSystemMetrics({
          parameters: { categories: ['system', 'agents'], timeRange: '5m' }
        });
        
        if (metricsResult.success) {
          health.system_metrics = metricsResult.result;
          health.performance_score = monitoringAgent.calculatePerformanceScore(metricsResult.result);
        }
      } catch (error) {
        logger.warn('Could not get detailed metrics from monitoring agent:', error);
      }
    }

    return health;

  } catch (error) {
    logger.error('Error getting system health:', error);
    return {
      overall_status: 'unknown',
      error: error.message,
      last_check: new Date().toISOString()
    };
  }
};

export const restartAgent = async (agentType) => {
  try {
    logger.info(`🔄 Restarting ${agentType} agent...`);

    const agents = getAgents();
    const currentAgent = agents[agentType];

    if (!currentAgent) {
      throw new Error(`Agent ${agentType} not found or not initialized`);
    }

    // Shutdown current agent
    await currentAgent.shutdown();

    // Create and initialize new agent
    let newAgent;
    switch (agentType) {
      case 'orchestrator':
        orchestratorAgent = new OrchestratorAgent();
        newAgent = orchestratorAgent;
        break;
      case 'nlp':
        nlpAgent = new NLPAgent();
        newAgent = nlpAgent;
        break;
      case 'search':
        searchAgent = new SearchAgent();
        newAgent = searchAgent;
        break;
      case 'omnidimension':
        omniDimensionAgent = new OmniDimensionAgent();
        newAgent = omniDimensionAgent;
        break;
      case 'monitoring':
        monitoringAgent = new MonitoringAgent();
        newAgent = monitoringAgent;
        break;
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }

    await newAgent.initialize();
    
    logger.info(`✅ ${agentType} agent restarted successfully`);
    
    return {
      success: true,
      agent_id: newAgent.id,
      agent_type: agentType,
      restarted_at: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`❌ Failed to restart ${agentType} agent:`, error);
    throw error;
  }
};

const startAgentHealthMonitoring = () => {
  // Monitor agent health every 30 seconds
  setInterval(async () => {
    try {
      const agents = getAgents();
      
      Object.entries(agents).forEach(([type, agent]) => {
        if (agent) {
          const timeSinceHeartbeat = Date.now() - agent.lastHeartbeat.getTime();
          
          // If no heartbeat for 2 minutes, consider agent unhealthy
          if (timeSinceHeartbeat > 120000) {
            logger.warn(`Agent ${type} (${agent.id}) hasn't sent heartbeat for ${Math.round(timeSinceHeartbeat / 1000)} seconds`);
            
            // If no heartbeat for 5 minutes, attempt restart
            if (timeSinceHeartbeat > 300000) {
              logger.error(`Agent ${type} appears to be dead, attempting restart...`);
              restartAgent(type).catch(error => {
                logger.error(`Failed to restart ${type} agent:`, error);
              });
            }
          }
        }
      });

    } catch (error) {
      logger.error('Error in agent health monitoring:', error);
    }
  }, 30000);

  logger.info('🩺 Agent health monitoring started');
};

// Export agent classes for direct instantiation if needed
export {
  OrchestratorAgent,
  NLPAgent,
  SearchAgent,
  OmniDimensionAgent,
  MonitoringAgent
};

export default {
  initializeAgents,
  getAgents,
  getAgent,
  shutdownAgents,
  getAgentStatus,
  getSystemHealth,
  restartAgent,
  OrchestratorAgent,
  NLPAgent,
  SearchAgent,
  OmniDimensionAgent,
  MonitoringAgent
};