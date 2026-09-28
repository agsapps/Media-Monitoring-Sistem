import "dotenv/config";
import { defineConfig } from "prisma/config";

const host = process.env.CUSTOM_SQL_HOST || "127.0.0.1";
const port = process.env.CUSTOM_SQL_PORT || "5432";
const user = process.env.CUSTOM_SQL_USER || "media_monitoring";
const password = process.env.CUSTOM_SQL_PASSWORD || "";
const database = process.env.CUSTOM_SQL_DATABASE || "media_monitoring";

export default defineConfig({
  schema: "prisma/schema.prisma",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`,
  },
});
