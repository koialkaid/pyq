import dotenv from "dotenv";
import sequelize from "../config/database";

dotenv.config();

export async function migrateMusicSourceUrl() {
  try {
    await sequelize.query(
      "ALTER TABLE music_tracks ADD COLUMN source_url VARCHAR(1000) NOT NULL DEFAULT '' AFTER artist"
    );
    console.log("Applied: music_tracks.source_url");
  } catch (error) {
    const message = String((error as Error)?.message || error);
    if (/duplicate column|already exists/i.test(message)) {
      console.log("Already present: music_tracks.source_url");
    } else {
      throw error;
    }
  }

  await sequelize.query(
    `UPDATE music_tracks
     SET source_url = :sourceUrl
     WHERE title = :title AND artist = :artist AND source_url = ''`,
    {
      replacements: {
        sourceUrl: "https://freesound.org/people/thinkingfish/sounds/695619/",
        title: "Forestia_RainOnLeaves_Field-Recording_ThinkingFish",
        artist: "thinkingfish",
      },
    }
  );
  console.log("Ensured Forestia source URL is recorded");
}

async function main() {
  try {
    await sequelize.authenticate();
    await migrateMusicSourceUrl();
  } catch (error) {
    console.error("Music source URL migration failed:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

if (require.main === module) void main();
