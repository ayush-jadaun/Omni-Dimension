/**
 * CORS Configuration - Fixed Headers
 * Current Time: 2025-06-20 10:50:09 UTC
 * Current User: ayush20244048
 */

export const corsConfig = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "https://omnidimension.vercel.app",
      "https://omnidimension-frontend.vercel.app",
    ];

    // Add production URLs based on environment
    if (process.env.NODE_ENV === "production") {
      allowedOrigins.push(
        "https://yourdomain.com",
        "https://www.yourdomain.com"
      );
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin at 2025-06-20 10:50:09: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    // Session and User Headers
    "X-Session-ID",
    "x-session-id",
    "X-User-ID",
    "x-user-id",
    "x-user", // ADD THIS - your frontend is sending this
    "X-User", // ADD THIS - case variation
    // API Headers
    "X-Request-ID",
    "x-request-id",
    "X-API-Version",
    "x-api-version", // ADD THIS - your frontend sends this
    "X-API-Key",
    "x-api-key",
    "x-build",
    // Timestamp Headers
    "X-Timestamp",
    "x-timestamp", // ADD THIS - your frontend sends this
    // Custom Headers
    "X-Client-Version",
    "x-client-version",
    "X-Platform",
    "x-platform",
    // Standard Headers
    "Referer",
    "User-Agent",
    "Accept-Encoding",
    "Accept-Language",
    "Connection",
    "Host",
  ],
  exposedHeaders: [
    "X-Total-Count",
    "X-Page-Count",
    "X-Current-Page",
    "X-Session-ID",
    "X-Request-ID",
    "X-API-Version",
  ],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
  maxAge: 86400, // 24 hours - cache preflight response
};

// Additional CORS middleware for complex requests
export const corsPreflightHandler = (req, res, next) => {
  console.log(`🔍 CORS Preflight check at 2025-06-20 10:50:09:`, {
    method: req.method,
    origin: req.headers.origin,
    headers: req.headers["access-control-request-headers"],
    currentUser: "ayush20244048",
  });

  if (req.method === "OPTIONS") {
    // Handle preflight request
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,PATCH,OPTIONS"
    );
    res.header(
      "Access-Control-Allow-Headers",
      [
        "Origin",
        "X-Requested-With",
        "Content-Type",
        "Accept",
        "Authorization",
        "Cache-Control",
        "X-Session-ID",
        "x-session-id",
        "X-User-ID",
        "x-user-id",
        "x-user",
        "X-User",
        "X-Request-ID",
        "x-request-id",
        "X-API-Version",
        "x-api-version",
        "X-API-Key",
        "x-api-key",
        "X-Timestamp",
        "x-timestamp",
        "X-Client-Version",
        "x-client-version",
        "Referer",
        "User-Agent",
      ].join(",")
    );
    res.header("Access-Control-Max-Age", "86400");

    console.log(`✅ CORS Preflight response sent at 2025-06-20 10:50:09`);
    return res.status(200).end();
  }

  next();
};

export default corsConfig;
