/**
 * 应用初始化（数据库连接 + 黑名单清理）
 *
 * 数据库表和初始数据应在部署前通过 `npm run db:init` 受控创建。
 * 应用启动默认不会执行 DDL；仅保留 `DB_SYNC_ON_BOOT=true` 作为旧部署的
 * 临时兼容开关，生产环境不推荐启用。
 */
import { sequelize } from "./models";

let readyPromise: Promise<void> | null = null;

async function doBootstrap(): Promise<void> {
  await sequelize.authenticate();
  console.log("Database connected.");

  // 正式部署不应在应用启动或 Serverless 冷启动中执行 DDL。保留此开关仅供
  // 旧环境短期迁移，推荐先在受信任维护环境中运行 `npm run db:init`。
  if (process.env.DB_SYNC_ON_BOOT === "true") {
    console.warn("DB_SYNC_ON_BOOT=true: synchronizing models in compatibility mode. Use `npm run db:init` for deployments.");
    await sequelize.sync();
    console.log("Models synchronized.");
  }

  // 启动时清理已过期的黑名单记录（失败不阻断启动）
  try {
    const { blacklistService } = await import("./services/blacklist-service");
    const cleaned = await blacklistService.cleanupExpired();
    if (cleaned > 0) console.log(`Cleaned ${cleaned} expired blacklist entries.`);
  } catch (e) {
    console.warn("Blacklist cleanup skipped:", (e as Error).message);
  }
}

/**
 * 确保应用已初始化。可安全地多次调用——同一进程内只会真正执行一次，
 * 并发调用会等待同一个 Promise（不会触发多次并发的 sync()）。
 * 初始化失败时清空缓存，允许下一次请求重试（避免一次网络抖动导致
 * 整个函数实例永久卡死在失败状态）。
 */
export function ensureReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = doBootstrap().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
}
