import dotenv from "dotenv";
import sequelize from "../config/database";

dotenv.config();

async function addColumn(sql: string, name: string) {
  try {
    await sequelize.query(sql);
    console.log(`Applied: ${name}`);
  } catch (error: any) {
    const message = String(error?.message || error);
    if (/duplicate column|already exists/i.test(message)) {
      console.log(`Already present: ${name}`);
      return;
    }
    throw error;
  }
}

/** Adds the non-destructive article series fields required by current releases. */
export async function migrateArticleSeries() {
  await addColumn(
    "ALTER TABLE posts ADD COLUMN series VARCHAR(100) NOT NULL DEFAULT '' AFTER category",
    "posts.series"
  );
  await addColumn(
    "ALTER TABLE posts ADD COLUMN series_order INT NOT NULL DEFAULT 0 AFTER series",
    "posts.series_order"
  );
}

async function main() {
  try {
    await sequelize.authenticate();
    await migrateArticleSeries();
  } catch (error) {
    console.error("Article series migration failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

if (require.main === module) void main();
