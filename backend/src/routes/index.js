import express from 'express';
import { HTTP_STATUS } from '../config/constants.js';
import { getSystemHealth } from '../agents/index.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// @route   GET /
// @desc    Root endpoint - API welcome
// @access  Public
router.get('/', async (req, res) => {
  try {
    const health = await getSystemHealth();
    
    res.json({
      message: 'Welcome to OmniDimension Multi-Agent System API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      status: 'operational',
      system_health: health.overall_status,
      endpoints: {
        authentication: '/api/auth',
        chat: '/api/chat',
        workflows: '/api/workflows', 
        users: '/api/users',
        admin: '/api/admin',
        health: '/health',
        documentation: '/docs'
      },
      features: [
        'Multi-agent AI orchestration',
        'Voice calling automation',
        'Appointment booking',
        'Restaurant reservations',
        'Real-time chat interface',
        'Workflow management',
        'System monitoring'
      ]
    });
  } catch (error) {
    logger.error('Error in root endpoint:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: 'Welcome to OmniDimension API',
      status: 'degraded',
      error: 'Unable to fetch system health'
    });
  }
});

// @route   GET /docs
// @desc    API Documentation
// @access  Public
router.get('/docs', (req, res) => {
  const documentation = {
    api: {
      name: 'OmniDimension Multi-Agent System API',
      version: '1.0.0',
      description: 'Intelligent automation through multi-agent orchestration with voice calling capabilities'
    },
    authentication: {
      type: 'Session-based with cookies',
      endpoints: {
        'POST /api/auth/register': 'Register new user account',
        'POST /api/auth/login': 'Login user',
        'POST /api/auth/logout': 'Logout user',
        'POST /api/auth/refresh': 'Refresh session',
        'GET /api/auth/me': 'Get current user info',
        'POST /api/auth/change-password': 'Change password',
        'GET /api/auth/sessions': 'Get active sessions',
        'DELETE /api/auth/sessions/:id': 'Terminate session'
      }
    },
    chat: {
      description: 'Real-time chat interface with AI agents',
      endpoints: {
        'POST /api/chat/message': 'Send message to AI',
        'GET /api/chat/conversations': 'Get conversation history',
        'GET /api/chat/conversations/:id': 'Get specific conversation',
        'GET /api/chat/active': 'Get active conversation',
        'POST /api/chat/feedback': 'Submit feedback',
        'GET /api/chat/statistics': 'Get chat statistics'
      }
    },
    workflows: {
      description: 'Manage automation workflows',
      endpoints: {
        'GET /api/workflows': 'List workflows',
        'POST /api/workflows': 'Create workflow',
        'GET /api/workflows/:id': 'Get workflow details',
        'PUT /api/workflows/:id': 'Update workflow',
        'POST /api/workflows/:id/cancel': 'Cancel workflow',
        'GET /api/workflows/active': 'Get active workflows',
        'GET /api/workflows/statistics': 'Get workflow statistics'
      }
    },
    users: {
      description: 'User profile and account management',
      endpoints: {
        'GET /api/users/profile': 'Get user profile',
        'PUT /api/users/profile': 'Update profile',
        'GET /api/users/dashboard': 'Get dashboard data',
        'GET /api/users/activity': 'Get activity history',
        'GET /api/users/preferences': 'Get preferences',
        'PUT /api/users/preferences': 'Update preferences',
        'DELETE /api/users/account': 'Delete account'
      }
    },
    admin: {
      description: 'Administrative functions (Admin role required)',
      endpoints: {
        'GET /api/admin/dashboard': 'Admin dashboard',
        'GET /api/admin/users': 'Manage users',
        'GET /api/admin/system/status': 'System status',
        'GET /api/admin/workflows': 'All workflows',
        'GET /api/admin/analytics': 'System analytics',
        'POST /api/admin/system/maintenance': 'Maintenance tasks'
      }
    },
    websocket: {
      description: 'Real-time updates via WebSocket',
      url: 'ws://localhost:8000/ws',
      events: [
        'message_received',
        'message_response',
        'workflow_started',
        'workflow_completed',
        'processing_started',
        'processing_completed'
      ]
    },
    agents: {
      description: 'AI Agent System',
      types: {
        orchestrator: 'Central coordinator managing workflows',
        nlp: 'Natural language processing and understanding',
        search: 'Business and location search via Google Places',
        omnidimension: 'Voice calling and appointment booking',
        monitoring: 'System health and performance monitoring'
      }
    },
    rate_limits: {
      general: '100 requests per 15 minutes',
      auth: '5 requests per 15 minutes',
      chat: '10 requests per minute'
    },
    examples: {
      register: {
        url: 'POST /api/auth/register',
        body: {
          username: 'ayush20244048',
          email: 'ayush@example.com',
          password: 'SecurePass123',
          firstName: 'Ayush',
          lastName: 'Sharma'
        }
      },
      chat: {
        url: 'POST /api/chat/message',
        body: {
          message: 'Book me a dental appointment for tomorrow morning',
          context: {
            location: 'New York, NY'
          }
        }
      }
    }
  };

  res.json(documentation);
});

// @route   GET /api-status
// @desc    Quick API status check
// @access  Public
router.get('/api-status', async (req, res) => {
  try {
    const health = await getSystemHealth();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      agents: health.active_agents || 0,
      system_health: health.overall_status
    });
  } catch (error) {
    res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      status: 'error',
      message: 'Service health check failed'
    });
  }
});

export default router;