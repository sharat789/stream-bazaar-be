export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "streamcart",
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },
  jwt: {
    secret: (process.env.JWT_SECRET ||
      "your-secret-key-change-in-production") as string,
    refreshSecret: (process.env.JWT_REFRESH_SECRET ||
      "your-refresh-secret-key-change-in-production") as string,
    accessTokenExpiry: (process.env.JWT_ACCESS_EXPIRY || "15m") as string,
    refreshTokenExpiry: (process.env.JWT_REFRESH_EXPIRY || "7d") as string,
  },
  agora: {
    appId: process.env.AGORA_APP_ID || "",
    appCertificate: process.env.AGORA_APP_CERTIFICATE || "",
    tokenExpiry: parseInt(process.env.AGORA_TOKEN_EXPIRY || "3600"), // 1 hour default
  },
};
