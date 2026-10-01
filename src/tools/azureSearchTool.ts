import { DynamicTool } from "@langchain/core/tools";
import { searchDocuments } from "../services/azureSearch";

/**
 * Azure AI Search tool for querying unstructured document data.
 * The master agent calls this with a natural language question.
 * Internally hits the Azure AI Search index and returns relevant document chunks.
 */
export function buildAzureSearchTool(): DynamicTool {
  return new DynamicTool({
    name: "search_unstructured_data",
    description: `Use this tool to answer questions about documents, reports, policies, 
manuals, contracts, or any unstructured text content stored as files (PDFs, Word docs, etc.).
Input: A clear natural language question about document content.
Output: Relevant excerpts from the matching documents.
Do NOT use this for tabular data, numbers, or database records — use query_structured_data instead.`,
    func: async (question: string): Promise<string> => {
      try {
        const result = await searchDocuments(question);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `Document search failed: ${message}`;
      }
    },
  });
}
