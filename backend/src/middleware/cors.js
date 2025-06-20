export const corsConfig = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
  
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://omnidimension.vercel.app',
        'https://omnidimension-frontend.vercel.app'
      ];
  
      // Add production URLs based on environment
      if (process.env.NODE_ENV === 'production') {
        allowedOrigins.push(
          'https://yourdomain.com',
          'https://www.yourdomain.com'
        );
      }
  
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-Session-ID',
      'X-User-ID',
      'X-Request-ID'
    ],
    exposedHeaders: [
      'X-Total-Count',
      'X-Page-Count',
      'X-Current-Page',
      'X-Session-ID'
    ],
    maxAge: 86400 // 24 hours
  };