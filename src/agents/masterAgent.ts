import { AzureChatOpenAI } from "@langchain/openai";
import { createToolCallingAgent, AgentExecutor } from "@langchain/classic/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { BaseMessage } from "@langchain/core/messages";
import { config } from "../config";
import { buildSqlTool } from "../tools/sqlTool";
import { buildAzureSearchTool } from "../tools/azureSearchTool";

export interface AgentResponse {
  answer: string;
  toolsUsed: string[];
}

let agentExecutor: AgentExecutor | null = null;

const SYSTEM_PROMPT = `You are an intelligent data assistant with access to two data sources:

1. **Structured Data (SQL Database)** — Use the \`query_structured_data\` tool for questions 
   about tabular records, numbers, dates, aggregations, counts, sales figures, user records, 
   inventory, or any data that lives in rows and columns.

2. **Unstructured Data (Documents)** — Use the \`search_unstructured_data\` tool for questions 
   about policies, reports, manuals, contracts, procedures, or any content from documents/files.

**Decision Rules:**
- If the question is clearly about numbers, records, or database data → use query_structured_data
- If the question is clearly about documents, policies, or written content → use search_unstructured_data  
- If the question could involve both (e.g., "compare the policy with actual sales data") → call BOTH tools
- If you're unsure, prefer trying both tools

**Response Guidelines:**
- Always synthesize a clear, concise answer from the tool results
- If the data is numerical, format it clearly (tables, lists)
- If the data is from documents, cite what the documents say
- If no relevant data is found, say so clearly and suggest rephrasing
- Never make up data — only use what the tools return`;

/**
 * Initializes and returns the master orchestrator AgentExecutor (singleton).
 * The executor holds the LLM + both tools and manages the reasoning loop.
 */
export async function getMasterAgent(): Promise<AgentExecutor> {
  if (agentExecutor) return agentExecutor;

  console.log("🤖 Initializing Master Orchestrator Agent...");

  // 1. Master LLM (GPT-4o — best for tool-calling decisions)
  const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: config.azureOpenAI.apiKey,
    azureOpenAIEndpoint: config.azureOpenAI.endpoint,
    azureOpenAIApiDeploymentName: config.azureOpenAI.deploymentName,
    azureOpenAIApiVersion: config.azureOpenAI.apiVersion,
    temperature: 0.2,
  });

  // 2. Build both tools
  const [sqlTool, azureSearchTool] = await Promise.all([
    buildSqlTool(),
    Promise.resolve(buildAzureSearchTool()),
  ]);

  const tools = [sqlTool, azureSearchTool];

  // 3. Build the prompt with chat history support for multi-turn conversations
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  // 4. Create the tool-calling agent (uses LLM's native function/tool calling)
  const agent = createToolCallingAgent({ llm, tools, prompt });

  // 5. Wrap in AgentExecutor (manages the reasoning → tool call → observe loop)
  agentExecutor = new AgentExecutor({
    agent,
    tools,
    verbose: config.server.nodeEnv === "development",
    maxIterations: 5, // Prevent runaway loops
    returnIntermediateSteps: true,
  });

  console.log("✅ Master Orchestrator Agent ready");
  return agentExecutor;
}

/**
 * Runs the master agent with a user question and optional chat history.
 *
 * @param question - User's natural language question
 * @param chatHistory - Previous messages for multi-turn conversation support
 * @returns AgentResponse with the final answer and list of tools used
 */
export async function runAgent(
  question: string,
  chatHistory: BaseMessage[] = []
): Promise<AgentResponse> {
  const executor = await getMasterAgent();

  const result = await executor.invoke({
    input: question,
    chat_history: chatHistory,
  });

  // Extract which tools were actually called during this run
  const toolsUsed: string[] = [];
  if (result.intermediateSteps && Array.isArray(result.intermediateSteps)) {
    for (const step of result.intermediateSteps) {
      const toolName = step?.action?.tool;
      if (toolName && !toolsUsed.includes(toolName)) {
        toolsUsed.push(toolName);
      }
    }
  }

  return {
    answer:
      typeof result.output === "string"
        ? result.output
        : JSON.stringify(result.output),
    toolsUsed,
  };
}
