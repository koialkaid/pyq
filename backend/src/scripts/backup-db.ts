import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { QueryTypes } from "sequelize";
import { sequelize } from "../models";

async function main(): Promise<void> {
  await sequelize.authenticate();
  try {
    const tables: Record<string, unknown[]> = {};
    // Read the live table columns directly. This keeps a pre-migration backup
    // possible when the code model already contains additive new columns.
    for (const model of Object.values(sequelize.models).sort((a, b) => a.name.localeCompare(b.name))) {
      const tableName = model.tableName;
      const quoted = sequelize.getQueryInterface().quoteIdentifier(tableName);
      tables[tableName] = await sequelize.query(`SELECT * FROM ${quoted}`, { type: QueryTypes.SELECT });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
    const output = path.resolve(outputArg?.slice("--output=".length) || path.join("backups", `tidb-${timestamp}.json`));
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(
      output,
      JSON.stringify(
        {
          format: "pyq-sequelize-json-v1",
          createdAt: new Date().toISOString(),
          database: process.env.DB_NAME || "",
          tables,
        },
        null,
        2
      ),
      "utf8"
    );

    const rowCount = Object.values(tables).reduce((total, rows) => total + rows.length, 0);
    console.log(`Database backup created: ${output} (${Object.keys(tables).length} tables, ${rowCount} rows).`);
  } finally {
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
