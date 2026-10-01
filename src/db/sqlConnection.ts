import { DataSource } from "typeorm";
import { config } from "../config";

/**
 * Singleton TypeORM DataSource for SQL Server.
 * LangChain's SqlDatabase utility requires a TypeORM DataSource.
 */
let dataSource: DataSource | null = null;

export async function getSqlDataSource(): Promise<DataSource> {
  if (dataSource && dataSource.isInitialized) {
    return dataSource;
  }

  dataSource = new DataSource({
    type: "mssql",
    host: config.sql.server,
    port: config.sql.port,
    username: config.sql.user,
    password: config.sql.password,
    database: config.sql.database,
    options: {
      encrypt: config.sql.encrypt,
      trustServerCertificate: config.sql.trustServerCertificate,
    },
    synchronize: false, // Never auto-sync in production
    logging: config.server.nodeEnv === "development" ? ["query", "error"] : ["error"],
  });

  await dataSource.initialize();
  console.log("✅ SQL Server connection established");
  return dataSource;
}

export async function closeSqlDataSource(): Promise<void> {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
    dataSource = null;
    console.log("🔌 SQL Server connection closed");
  }
}
