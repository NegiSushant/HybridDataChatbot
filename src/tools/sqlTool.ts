import { DynamicTool, ToolInterface } from "@langchain/core/tools";
import { AzureChatOpenAI } from "@langchain/openai";
import { SqlDatabase } from "@langchain/classic/sql_db";
import { createSqlAgent, SqlToolkit } from "@langchain/classic/agents/toolkits/sql";
import { AgentExecutor } from "@langchain/classic/agents";
import { getSqlDataSource } from "../db/sqlConnection";
import { config } from "../config";

// ─────────────────────────────────────────────────────────────
// SQL AGENT PROMPT CUSTOMIZATION
// Equivalent to Python's agent_kwargs: { prefix, suffix }
// ─────────────────────────────────────────────────────────────

/**
 * PREFIX — injected before the tool list.
 * Sets the agent's persona, context, and behavioral rules.
 *
 * Python equivalent:
 *   agent_kwargs = { 'prefix': self.prefix }
 */
const SQL_AGENT_PREFIX = `You are an expert SQL data analyst working with a Microsoft SQL Server database.
Your job is to answer user questions by querying the database accurately and safely.

STRICT RULES you must always follow:
1. NEVER use DROP, DELETE, INSERT, UPDATE, ALTER, TRUNCATE, or any data-modifying statements.
   You are READ-ONLY. Violation of this rule is strictly prohibited.
2. Always inspect the database schema FIRST using the available tools before writing a query.
3. If a query could return a very large result set, add a TOP or LIMIT clause.
4. If you are unsure about a table or column name, check the schema — do not guess.
5. Always prefer clear, efficient SQL. Avoid unnecessary subqueries.
6. If the question cannot be answered from the database, say so clearly.
7. When returning numbers, include appropriate units or context if available.

You have access to the following tools:`;

/**
 * SUFFIX — injected after the tool list, right before the agent's reasoning scratchpad.
 * This is where you give final instructions and define the output format.
 *
 * Python equivalent:
 *   agent_kwargs = { 'suffix': self.suffix }
 */
const SQL_AGENT_SUFFIX = `Begin! Remember to follow all rules, especially: NO data modification queries.
Provide a clear, well-formatted final answer that directly addresses the user's question.
If the result is tabular, format it as a readable list or table.

Question: {input}
Thought: {agent_scratchpad}`;

/**
 * FORMAT INSTRUCTIONS — controls how the agent structures its output.
 * Note: In LangChain JS, there is no direct 'format_instructions' parameter
 * for createSqlAgent. Instead, we embed formatting guidance in the suffix above.
 * This is functionally equivalent to Python's agent_kwargs format_instructions.
 *
 * Kept here as a reference / for use in custom prompt construction if needed.
 */
// export const SQL_FORMAT_INSTRUCTIONS = `...`; // embed in SUFFIX instead

// ─────────────────────────────────────────────────────────────
// EXTRA TOOLS
// Equivalent to Python's extra_tools=custom_tools.get_tools()
// ─────────────────────────────────────────────────────────────

/**
 * Add any custom tools the SQL agent should have access to IN ADDITION
 * to the standard SQL toolkit tools (list_tables, schema, query, checker).
 *
 * Example: a calculator tool, a date-helper tool, etc.
 *
 * Python equivalent:
 *   createSqlAgent(llm=llm, toolkit=toolkit, extra_tools=custom_tools.get_tools())
 */
const EXTRA_TOOLS: ToolInterface[] = [
  // Add custom tools here, e.g.:
  // new CalculatorTool(),
  // new DateHelperTool(),
];

// ─────────────────────────────────────────────────────────────
// AGENT EXECUTOR OPTIONS
// Equivalent to Python's agent_executor_kwargs and top-level args
// ─────────────────────────────────────────────────────────────

/**
 * AgentExecutor configuration.
 *
 * Python equivalents:
 *   handle_parsing_errors  → handleParsingErrors
 *   return_intermediate_steps → returnIntermediateSteps
 *   max_iterations         → maxIterations
 *   max_execution_time     → (no direct TS equivalent — use maxIterations)
 *   early_stopping_method  → earlyStoppingMethod ("force" | "generate")
 *   verbose                → verbose (via ChainInputs)
 */
const AGENT_EXECUTOR_OPTIONS = {
  /** Send parsing errors back to LLM as observations instead of throwing */
  handleParsingErrors: true as boolean | string,

  /** Return intermediate steps (tool calls + observations) in the result */
  returnIntermediateSteps: true,

  /** Max number of agent iterations before force-stopping (replaces max_execution_time) */
  maxIterations: 20,

  /**
   * What to do when maxIterations is reached:
   * - "force"    → return immediately with what the agent has so far
   * - "generate" → ask the LLM to generate a final answer from partial results
   */
  earlyStoppingMethod: "force" as "force" | "generate",

  /** Print reasoning steps to console (set false in production) */
  verbose: config.server.nodeEnv === "development",
};

// ─────────────────────────────────────────────────────────────
// BUILDER
// ─────────────────────────────────────────────────────────────

let sqlTool: DynamicTool | null = null;

/**
 * Builds and returns the SQL DynamicTool (singleton).
 *
 * Internally creates a fully configured SQL agent with:
 * - Custom prefix / suffix prompt
 * - Extra tools support
 * - handleParsingErrors, returnIntermediateSteps, maxIterations, earlyStoppingMethod
 *
 * The master agent calls this tool with a natural language question.
 * The inner SQL agent handles schema introspection, SQL generation, and execution.
 */
export async function buildSqlTool(): Promise<DynamicTool> {
  if (sqlTool) return sqlTool;

  console.log("🔧 Initializing SQL Agent tool...");

  // 1. Get the TypeORM DataSource
  const dataSource = await getSqlDataSource();

  // 2. Wrap it in LangChain's SqlDatabase helper (auto-introspects schema)
  const db = await SqlDatabase.fromDataSourceParams({
    appDataSource: dataSource,
  });

  // 3. LLM for the inner SQL agent (temperature=0 for deterministic SQL)
  const llm = new AzureChatOpenAI({
    azureOpenAIApiKey: config.azureOpenAI.apiKey,
    azureOpenAIEndpoint: config.azureOpenAI.endpoint,
    azureOpenAIApiDeploymentName: config.azureOpenAI.deploymentName,
    azureOpenAIApiVersion: config.azureOpenAI.apiVersion,
    temperature: 0,
  });

  // 4. Create the SQL toolkit (provides: list_tables, schema, query, query_checker)
  const toolkit = new SqlToolkit(db, llm);

  // 5. Merge toolkit tools + any extra custom tools
  //    Python equivalent: extra_tools=custom_tools.get_tools()
  const allTools = [...toolkit.getTools(), ...EXTRA_TOOLS];

  // 6. Build the SQL agent with custom prefix/suffix and topK
  //    createSqlAgent returns an AgentExecutor, but we need to rebuild
  //    it with extra options (handleParsingErrors, returnIntermediateSteps, etc.)
  //    so we extract the inner agent and reconstruct the executor manually.
  const baseSqlExecutor = createSqlAgent(llm, toolkit, {
    topK: 10,           // Max rows per query result
    prefix: SQL_AGENT_PREFIX,
    suffix: SQL_AGENT_SUFFIX,
  });

  // 7. Reconstruct AgentExecutor with full options
  //    This is the TypeScript equivalent of:
  //    agent_executor_kwargs = { handle_parsing_errors, return_intermediate_steps }
  //    + max_iterations, verbose at the top level
  const configuredSqlExecutor = AgentExecutor.fromAgentAndTools({
    agent: baseSqlExecutor.agent,
    tools: allTools,
    handleParsingErrors: AGENT_EXECUTOR_OPTIONS.handleParsingErrors,
    returnIntermediateSteps: AGENT_EXECUTOR_OPTIONS.returnIntermediateSteps,
    maxIterations: AGENT_EXECUTOR_OPTIONS.maxIterations,
    earlyStoppingMethod: AGENT_EXECUTOR_OPTIONS.earlyStoppingMethod,
    verbose: AGENT_EXECUTOR_OPTIONS.verbose,
  });

  // 8. Wrap the fully configured SQL executor as a single DynamicTool
  //    so the master orchestrator agent sees it as one black-box tool
  sqlTool = new DynamicTool({
    name: "query_structured_data",
    description: `Use this tool to answer questions about structured or tabular data 
stored in a SQL Server database (e.g., sales figures, records, counts, aggregations, 
reports involving numbers, dates, or any database records).
Input: A clear natural language question about the data.
Output: The query result as text.
Do NOT use this for document or policy questions — use search_unstructured_data instead.`,

    func: async (question: string): Promise<string> => {
      try {
        const result = await configuredSqlExecutor.invoke({ input: question });

        // Log intermediate steps in dev for debugging
        if (
          AGENT_EXECUTOR_OPTIONS.verbose &&
          result.intermediateSteps?.length > 0
        ) {
          console.log(
            `\n🔍 SQL Agent Steps (${result.intermediateSteps.length}):`
          );
          for (const step of result.intermediateSteps) {
            console.log(
              `  Tool: ${step.action?.tool} | Input: ${JSON.stringify(step.action?.toolInput)}`
            );
          }
        }

        return typeof result.output === "string"
          ? result.output
          : JSON.stringify(result.output);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("❌ SQL Agent error:", message);
        return `SQL query failed: ${message}`;
      }
    },
  });

  console.log("✅ SQL Agent tool ready");
  return sqlTool;
}
