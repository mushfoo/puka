import type { ApiRequest, ApiResponse } from "./types";

// In-memory transaction store for development
const activeTransactions = new Map<string, { id: string; startedAt: Date }>();

export async function handleTransactionRequest(
  req: ApiRequest,
  res: ApiResponse,
  userId: string | null,
  action?: string,
) {
  try {
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    switch (action) {
      case "begin":
        return await handleBeginTransaction(req, res, userId);
      case "commit":
        return await handleCommitTransaction(req, res, userId);
      case "rollback":
        return await handleRollbackTransaction(req, res, userId);
      default:
        res.status(404).json({ error: "Transaction action not found" });
    }
  } catch (error) {
    console.error("Transaction API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function handleBeginTransaction(req: ApiRequest, res: ApiResponse, _userId: string) {
  const { transactionId } = req.body || {};

  if (!transactionId) {
    return res.status(400).json({ error: "Transaction ID required" });
  }

  // Store the transaction
  activeTransactions.set(transactionId, {
    id: transactionId,
    startedAt: new Date(),
  });

  res.json({
    success: true,
    transactionId,
    message: "Transaction started",
  });
}

async function handleCommitTransaction(req: ApiRequest, res: ApiResponse, _userId: string) {
  const { transactionId } = req.body || {};

  if (!transactionId) {
    return res.status(400).json({ error: "Transaction ID required" });
  }

  if (!activeTransactions.has(transactionId)) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  // Remove the transaction
  activeTransactions.delete(transactionId);

  res.json({
    success: true,
    transactionId,
    message: "Transaction committed",
  });
}

async function handleRollbackTransaction(req: ApiRequest, res: ApiResponse, _userId: string) {
  const { transactionId } = req.body || {};

  if (!transactionId) {
    return res.status(400).json({ error: "Transaction ID required" });
  }

  if (!activeTransactions.has(transactionId)) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  // Remove the transaction
  activeTransactions.delete(transactionId);

  res.json({
    success: true,
    transactionId,
    message: "Transaction rolled back",
  });
}

