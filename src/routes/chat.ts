import { Router, Request, Response, NextFunction } from "express";
import { runAgent } from "../agents/masterAgent";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { BaseMessage } from "@langchain/core/messages";

const router = Router();

// In-memory session store for multi-turn chat
// In production, replace with Redis or a DB-backed store
const sessionStore = new Map<string, BaseMessage[]>();

/**
 * POST /api/chat
 *
 * Request body:
 * {
 *   "question": "What were total sales in Q1?",
 *   "sessionId": "optional-session-id-for-multi-turn"
 * }
 *
 * Response:
 * {
 *   "answer": "Total sales in Q1 were $4.2M ...",
 *   "toolsUsed": ["query_structured_data"],
 *   "sessionId": "abc123"
 * }
 */
router.post(
  "/chat",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { question, sessionId } = req.body as {
        question?: string;
        sessionId?: string;
      };

      // Validate input
      if (!question || typeof question !== "string" || !question.trim()) {
        res.status(400).json({
          error: "Bad Request",
          message: 'Field "question" is required and must be a non-empty string',
        });
        return;
      }

      const trimmedQuestion = question.trim();
      const currentSessionId = sessionId ?? crypto.randomUUID();

      // Retrieve existing chat history for this session
      const chatHistory = sessionStore.get(currentSessionId) ?? [];

      console.log(`📩 [${currentSessionId}] Question: ${trimmedQuestion}`);

      // Run the master agent
      const { answer, toolsUsed } = await runAgent(trimmedQuestion, chatHistory);

      // Update chat history for next turn
      chatHistory.push(new HumanMessage(trimmedQuestion));
      chatHistory.push(new AIMessage(answer));
      sessionStore.set(currentSessionId, chatHistory);

      // Trim history to last 20 messages to avoid context overflow
      if (chatHistory.length > 20) {
        sessionStore.set(currentSessionId, chatHistory.slice(-20));
      }

      console.log(
        `✅ [${currentSessionId}] Tools used: [${toolsUsed.join(", ") || "none"}]`
      );

      res.json({
        answer,
        toolsUsed,
        sessionId: currentSessionId,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/chat/:sessionId
 * Clears the conversation history for a given session
 */
router.delete(
  "/chat/:sessionId",
  (req: Request, res: Response): void => {
    const sessionId = String(req.params.sessionId);
    const existed = sessionStore.has(sessionId);
    sessionStore.delete(sessionId);

    res.json({
      success: true,
      message: existed
        ? `Session ${sessionId} cleared`
        : `Session ${sessionId} not found`,
    });
  }
);

export default router;
