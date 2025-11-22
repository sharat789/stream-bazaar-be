import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "streamcart",
  synchronize: true,
  logging: process.env.NODE_ENV === "development",
  entities:
    process.env.NODE_ENV === "production"
      ? ["build/entity/**/*.js"]
      : ["src/entity/**/*.ts"],
  migrations: [],
  subscribers: [],
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});
