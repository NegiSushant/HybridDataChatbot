import "dotenv/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, fallback: string = ""): string {
  return process.env[key] ?? fallback;
}

export const config = {
  // Azure OpenAI
  azureOpenAI: {
    apiKey: requireEnv("AZURE_OPENAI_API_KEY"),
    endpoint: requireEnv("AZURE_OPENAI_ENDPOINT"),
    deploymentName: requireEnv("AZURE_OPENAI_DEPLOYMENT_NAME"),
    apiVersion: optionalEnv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
  },

  // SQL Server
  sql: {
    server: requireEnv("SQL_SERVER"),
    database: requireEnv("SQL_DATABASE"),
    user: requireEnv("SQL_USER"),
    password: requireEnv("SQL_PASSWORD"),
    port: parseInt(optionalEnv("SQL_PORT", "1433"), 10),
    encrypt: optionalEnv("SQL_ENCRYPT", "true") === "true",
    trustServerCertificate:
      optionalEnv("SQL_TRUST_SERVER_CERTIFICATE", "false") === "true",
  },

  // Azure AI Search
  azureSearch: {
    endpoint: requireEnv("AZURE_SEARCH_ENDPOINT"),
    apiKey: requireEnv("AZURE_SEARCH_API_KEY"),
    indexName: requireEnv("AZURE_SEARCH_INDEX_NAME"),
    contentField: optionalEnv("AZURE_SEARCH_CONTENT_FIELD", "content"),
    semanticConfig: optionalEnv("AZURE_SEARCH_SEMANTIC_CONFIG", ""),
    topK: parseInt(optionalEnv("AZURE_SEARCH_TOP_K", "5"), 10),
  },

  // Server
  server: {
    port: parseInt(optionalEnv("PORT", "3000"), 10),
    nodeEnv: optionalEnv("NODE_ENV", "development"),
  },
} as const;
