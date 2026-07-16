import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const sqlHost = process.env.CUSTOM_SQL_HOST;
const sqlDbName = process.env.CUSTOM_SQL_DB_NAME;
const sqlPortStr = process.env.CUSTOM_SQL_PORT;
const sqlPort = sqlPortStr ? parseInt(sqlPortStr, 10) : 5432;
const user = process.env.CUSTOM_SQL_USER;
const password = process.env.CUSTOM_SQL_PASSWORD;

if (!sqlHost) {
  throw new Error("CUSTOM_SQL_HOST must be set in environment variables.");
}
if (!sqlDbName) {
  throw new Error("CUSTOM_SQL_DB_NAME must be set in environment variables.");
}
if (!user) {
  throw new Error("CUSTOM_SQL_USER must be set in environment variables.");
}
if (!password) {
  throw new Error("CUSTOM_SQL_PASSWORD must be set in environment variables.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    host: sqlHost,
    port: sqlPort,
    user: user,
    password: password,
    database: sqlDbName,
    ssl: false,
  },
  verbose: true,
});
