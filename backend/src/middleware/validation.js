import Joi from 'joi';
import { HTTP_STATUS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

// Generic validation middleware
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, { 
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation error:', { 
        path: req.path, 
        errors: errorMessages,
        data: data 
      });

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: 'Validation error',
        message: 'Please check your input data',
        details: errorMessages,
        code: 'VALIDATION_ERROR'
      });
    }

    req[source] = value;
    next();
  };
};

// User validation schemas
export const userSchemas = {
  register: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.alphanum': 'Username must only contain alphanumeric characters',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      }),
    
    firstName: Joi.string().max(50).optional(),
    lastName: Joi.string().max(50).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().optional()
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().max(50).optional(),
    lastName: Joi.string().max(50).optional(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
    timezone: Joi.string().optional(),
    preferences: Joi.object({
      language: Joi.string().valid('en', 'es', 'fr', 'de').optional(),
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        sms: Joi.boolean().optional(),
        push: Joi.boolean().optional()
      }).optional(),
      defaultLocation: Joi.object({
        address: Joi.string().optional(),
        coordinates: Joi.object({
          lat: Joi.number().min(-90).max(90).optional(),
          lng: Joi.number().min(-180).max(180).optional()
        }).optional()
      }).optional()
    }).optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])'))
      .required()
  })
};

// Chat validation schemas
export const chatSchemas = {
  sendMessage: Joi.object({
    message: Joi.string()
      .min(1)
      .max(4000)
      .required()
      .messages({
        'string.min': 'Message cannot be empty',
        'string.max': 'Message cannot exceed 4000 characters'
      }),
    
    context: Joi.object({
      workflowId: Joi.string().optional(),
      intent: Joi.string().optional(),
      metadata: Joi.object().optional()
    }).optional()
  }),

  updateMessage: Joi.object({
    content: Joi.string().min(1).max(4000).required(),
    metadata: Joi.object().optional()
  })
};

// Workflow validation schemas
export const workflowSchemas = {
  create: Joi.object({
    type: Joi.string()
      .valid('appointment', 'restaurant', 'custom', 'general_query')
      .required(),
    
    title: Joi.string()
      .min(3)
      .max(200)
      .required(),
    
    description: Joi.string()
      .max(1000)
      .optional(),
    
    intent: Joi.object({
      name: Joi.string().required(),
      confidence: Joi.number().min(0).max(1).optional(),
      entities: Joi.object().optional()
    }).optional(),
    
    priority: Joi.number()
      .min(1)
      .max(10)
      .default(5),
    
    tags: Joi.array()
      .items(Joi.string().max(50))
      .max(10)
      .optional(),
    
    metadata: Joi.object().optional()
  }),

  update: Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    description: Joi.string().max(1000).optional(),
    priority: Joi.number().min(1).max(10).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    metadata: Joi.object().optional()
  })
};

// Common parameter validation
export const paramSchemas = {
  mongoId: Joi.object({
    id: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid ID format'
      })
  }),

  uuid: Joi.object({
    id: Joi.string()
      .guid({ version: 'uuidv4' })
      .required()
      .messages({
        'string.guid': 'Invalid UUID format'
      })
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// File upload validation
export const fileSchemas = {
  image: Joi.object({
    mimetype: Joi.string()
      .valid('image/jpeg', 'image/png', 'image/gif', 'image/webp')
      .required(),
    size: Joi.number().max(5 * 1024 * 1024) // 5MB
  }),

  document: Joi.object({
    mimetype: Joi.string()
      .valid('application/pdf', 'text/plain', 'application/msword')
      .required(),
    size: Joi.number().max(10 * 1024 * 1024) // 10MB
  })
};

// Export validation middleware functions
export const validateUserRegistration = validate(userSchemas.register);
export const validateUserLogin = validate(userSchemas.login);
export const validateUserProfileUpdate = validate(userSchemas.updateProfile);
export const validatePasswordChange = validate(userSchemas.changePassword);
export const validateChatMessage = validate(chatSchemas.sendMessage);
export const validateMessageUpdate = validate(chatSchemas.updateMessage);
export const validateWorkflowCreate = validate(workflowSchemas.create);
export const validateWorkflowUpdate = validate(workflowSchemas.update);
export const validateMongoId = validate(paramSchemas.mongoId, 'params');
export const validateUUID = validate(paramSchemas.uuid, 'params');
export const validatePagination = validate(paramSchemas.pagination, 'query');