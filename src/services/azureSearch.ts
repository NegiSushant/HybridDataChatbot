import { SearchClient, AzureKeyCredential } from "@azure/search-documents";
import { config } from "../config";

// Document shape returned from the index — extend based on your actual index schema
interface SearchDocument {
  [key: string]: unknown;
}

let searchClient: SearchClient<SearchDocument> | null = null;

function getSearchClient(): SearchClient<SearchDocument> {
  if (!searchClient) {
    searchClient = new SearchClient<SearchDocument>(
      config.azureSearch.endpoint,
      config.azureSearch.indexName,
      new AzureKeyCredential(config.azureSearch.apiKey)
    );
  }
  return searchClient;
}

/**
 * Searches the Azure AI Search index with the given query.
 * Uses semantic search if a semantic config is provided; otherwise keyword search.
 *
 * @param query - Natural language query from the user
 * @returns Concatenated text of relevant document chunks
 */
export async function searchDocuments(query: string): Promise<string> {
  const client = getSearchClient();
  const { contentField, semanticConfig, topK } = config.azureSearch;

  const useSemanticSearch = semanticConfig.length > 0;

  let results;
  if (useSemanticSearch) {
    results = await client.search(query, {
      top: topK,
      select: [contentField],
      queryType: "semantic" as const,
      semanticSearchOptions: {
        configurationName: semanticConfig,
        answers: { answerType: "extractive" as const },
        captions: { captionType: "extractive" as const },
      },
    });
  } else {
    results = await client.search(query, {
      top: topK,
      select: [contentField],
    });
  }

  const chunks: string[] = [];

  for await (const result of results.results) {
    const doc = result.document as Record<string, unknown>;
    const content = doc[contentField];

    if (typeof content === "string" && content.trim()) {
      chunks.push(content.trim());
    }
  }

  if (chunks.length === 0) {
    return "No relevant documents found for this query.";
  }

  // Join chunks with separator for the LLM to parse clearly
  return chunks.join("\n\n---\n\n");
}
