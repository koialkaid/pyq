import dotenv from "dotenv";
import { QueryTypes } from "sequelize";
import sequelize from "../config/database";

dotenv.config();

function isAlreadyApplied(error: unknown) {
  const message = String((error as Error)?.message || error);
  return /duplicate column|already exists|duplicate key name/i.test(message);
}

async function apply(statement: string, label: string) {
  try {
    await sequelize.query(statement);
    console.log(`Applied: ${label}`);
  } catch (error) {
    if (isAlreadyApplied(error)) {
      console.log(`Already present: ${label}`);
      return;
    }
    throw error;
  }
}

async function makePostIdNullable() {
  const columns = await sequelize.query<{
    COLUMN_TYPE: string;
    COLLATION_NAME: string | null;
    IS_NULLABLE: "YES" | "NO";
  }>(
    `SELECT COLUMN_TYPE, COLLATION_NAME, IS_NULLABLE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'post_id'`,
    { type: QueryTypes.SELECT }
  );
  const column = columns[0];
  if (!column) throw new Error("comments.post_id does not exist");
  if (column.IS_NULLABLE === "YES") {
    console.log("Already present: comments.post_id nullable");
    return;
  }

  const collation = column.COLLATION_NAME ? ` COLLATE ${column.COLLATION_NAME}` : "";
  await sequelize.query(`ALTER TABLE comments MODIFY COLUMN post_id ${column.COLUMN_TYPE}${collation} NULL`);
  console.log("Applied: comments.post_id nullable");
}

/** Adds the comment target column and indexes required by fixed content/catalog pages. */
export async function migrateContentPages() {
  await makePostIdNullable();
  await apply(
    "ALTER TABLE comments ADD COLUMN page_id CHAR(36) NULL",
    "comments.page_id"
  );
  await apply(
    "CREATE INDEX comments_page_id_index ON comments (page_id)",
    "comments.page_id index"
  );
}

async function main() {
  try {
    await sequelize.authenticate();
    await migrateContentPages();
  } catch (error) {
    console.error("Content pages migration failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

if (require.main === module) {
  void main();
}
