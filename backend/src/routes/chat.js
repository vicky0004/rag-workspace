import express from 'express';
import { z } from 'zod';
import supabase from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { verifyWorkspaceOwnership } from './workspaces.js';
import { embedText, callGemini } from '../config/gemini.js';

const router = express.Router();

// ============================================================
// Tool definitions (Gemini function calling)
// ============================================================

const TOOL_DEFINITIONS = [
  {
    name: 'save_task',
    description: 'Save a new task or to-do item into the current workspace.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'The task title or description to save' },
      },
      required: ['title'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark an existing task or to-do item as completed or closed in the workspace. Provide taskTitle keyword or taskId.',
    parameters: {
      type: 'object',
      properties: {
        taskTitle: { type: 'string', description: 'Keyword or title matching the task to complete' },
        taskId: { type: 'string', description: 'Optional UUID of the task' },
      },
    },
  },
  {
    name: 'list_tasks',
    description: 'List all current tasks and their status in the current workspace.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by "pending" or "completed", or leave empty for all' },
      },
    },
  },
  {
    name: 'send_discord_summary',
    description: 'Send a text summary to the workspace Discord channel.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'The summary text to post to Discord' },
      },
      required: ['summary'],
    },
  },
];

const TOOL_ALLOWLIST = new Set(TOOL_DEFINITIONS.map(t => t.name));
TOOL_ALLOWLIST.add('close_task');

// Zod schemas for tool arg validation
const saveTaskSchema = z.object({ title: z.string().min(1) });
const completeTaskSchema = z.object({
  taskTitle: z.string().optional(),
  taskId: z.string().optional(),
});
const listTasksSchema = z.object({
  status: z.string().optional(),
});
const sendDiscordSchema = z.object({ summary: z.string().min(1) });

const TOOL_SCHEMAS = {
  save_task: saveTaskSchema,
  complete_task: completeTaskSchema,
  close_task: completeTaskSchema,
  list_tasks: listTasksSchema,
  send_discord_summary: sendDiscordSchema,
};

function formatToIST(isoDateStr) {
  if (!isoDateStr) return '';
  try {
    const d = new Date(isoDateStr);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: true,
    }) + ' IST';
  } catch {
    return isoDateStr;
  }
}

// ============================================================
// Tool executors
// ============================================================

async function executeSaveTask(workspaceId, args) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ workspace_id: workspaceId, title: args.title, status: 'pending' })
    .select('id, title, status, created_at')
    .single();

  if (error) throw error;
  return {
    saved: true,
    task: {
      ...data,
      created_at_ist: formatToIST(data.created_at),
    },
  };
}

async function executeCompleteTask(workspaceId, args) {
  let query = supabase
    .from('tasks')
    .select('id, title, status, created_at')
    .eq('workspace_id', workspaceId);

  if (args.taskId) {
    query = query.eq('id', args.taskId);
  } else if (args.taskTitle) {
    query = query.ilike('title', `%${args.taskTitle}%`);
  } else {
    query = query.eq('status', 'pending').order('created_at', { ascending: false }).limit(1);
  }

  const { data: matchedTasks, error: findError } = await query;
  if (findError) throw findError;

  if (!matchedTasks || matchedTasks.length === 0) {
    return {
      completed: false,
      message: `No matching task found for "${args.taskTitle || args.taskId || 'pending'}".`,
    };
  }

  const targetTask = matchedTasks[0];
  const { data: updated, error: updateError } = await supabase
    .from('tasks')
    .update({ status: 'completed' })
    .eq('id', targetTask.id)
    .select('id, title, status, created_at')
    .single();

  if (updateError) throw updateError;
  return {
    completed: true,
    task: {
      ...updated,
      created_at_ist: formatToIST(updated.created_at),
    },
  };
}

async function executeListTasks(workspaceId, args) {
  let query = supabase
    .from('tasks')
    .select('id, title, status, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (args?.status) {
    query = query.eq('status', args.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const formattedTasks = (data || []).map(t => ({
    id: t.id,
    title: t.title,
    status: t.status,
    created_at_ist: formatToIST(t.created_at),
  }));

  return { count: formattedTasks.length, tasks: formattedTasks };
}

async function executeDiscord(args) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error('Discord webhook not configured');
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: args.summary }),
  });

  if (!response.ok) {
    throw new Error(`Discord returned ${response.status}`);
  }

  return { sent: true };
}

async function executeToolCall(toolName, args, workspaceId) {
  switch (toolName) {
    case 'save_task':
      return await executeSaveTask(workspaceId, args);
    case 'complete_task':
    case 'close_task':
      return await executeCompleteTask(workspaceId, args);
    case 'list_tasks':
      return await executeListTasks(workspaceId, args);
    case 'send_discord_summary':
      return await executeDiscord(args);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ============================================================
// Tool call handler
// ============================================================

async function handleToolCall(toolName, rawArgs, workspaceId) {
  if (!TOOL_ALLOWLIST.has(toolName)) {
    const result = { error: 'unknown tool' };
    await logToolCall(workspaceId, toolName, rawArgs, 'failed', result);
    return { status: 'failed', result };
  }

  const schema = TOOL_SCHEMAS[toolName];
  const parsed = schema ? schema.safeParse(rawArgs) : { success: true, data: rawArgs };
  if (!parsed.success) {
    const result = { error: 'invalid args', details: parsed.error.flatten() };
    await logToolCall(workspaceId, toolName, rawArgs, 'failed', result);
    return { status: 'failed', result };
  }

  try {
    const result = await executeToolCall(toolName, parsed.data, workspaceId);
    await logToolCall(workspaceId, toolName, rawArgs, 'success', result);
    return { status: 'success', result };
  } catch (err) {
    const result = { error: err.message };
    await logToolCall(workspaceId, toolName, rawArgs, 'failed', result);
    return { status: 'failed', result };
  }
}

async function logToolCall(workspaceId, toolName, args, status, result) {
  await supabase.from('tool_calls').insert({
    workspace_id: workspaceId,
    tool_name: toolName,
    args,
    status,
    result,
  });
}

// ============================================================
// Similarity search
// ============================================================

const SIMILARITY_THRESHOLD = 0.3;
const TOP_K = 5;

async function retrieveChunks(workspaceId, queryEmbedding) {
  const { data, error } = await supabase.rpc('match_chunks', {
    query_embedding: queryEmbedding,
    match_workspace_id: workspaceId,
    match_count: TOP_K,
  });

  if (error) {
    console.warn('RPC match_chunks failed:', error.message);
    return [];
  }

  return data || [];
}

// ============================================================
// CHAT SESSIONS / CONVERSATIONS CRUD
// ============================================================

// GET /api/workspaces/:workspaceId/sessions — list chat sessions that have messages
router.get('/:workspaceId/sessions', requireAuth, async (req, res) => {
  const { workspaceId } = req.params;
  const workspace = await verifyWorkspaceOwnership(workspaceId, req.user.id, res);
  if (!workspace) return;

  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, created_at, updated_at, chat_messages(id)')
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Only return sessions that contain at least one message
    const nonEmptySessions = (data || [])
      .filter(s => s.chat_messages && s.chat_messages.length > 0)
      .map(({ chat_messages, ...session }) => session);

    res.json({ success: true, data: nonEmptySessions });
  } catch (err) {
    console.error('List chat sessions error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat sessions' });
  }
});

// POST /api/workspaces/:workspaceId/sessions — create a new chat session
router.post('/:workspaceId/sessions', requireAuth, async (req, res) => {
  const { workspaceId } = req.params;
  const { title } = req.body;
  const workspace = await verifyWorkspaceOwnership(workspaceId, req.user.id, res);
  if (!workspace) return;

  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        workspace_id: workspaceId,
        title: (title || 'New Chat').trim(),
      })
      .select('id, title, created_at, updated_at')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Create chat session error:', err);
    res.status(500).json({ success: false, message: 'Failed to create chat session' });
  }
});

// PATCH /api/workspaces/:workspaceId/sessions/:sessionId — rename session
router.patch('/:workspaceId/sessions/:sessionId', requireAuth, async (req, res) => {
  const { workspaceId, sessionId } = req.params;
  const { title } = req.body;
  const workspace = await verifyWorkspaceOwnership(workspaceId, req.user.id, res);
  if (!workspace) return;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update({ title: title.trim(), updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('workspace_id', workspaceId)
      .select('id, title, created_at, updated_at')
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Rename chat session error:', err);
    res.status(500).json({ success: false, message: 'Failed to rename chat session' });
  }
});

// DELETE /api/workspaces/:workspaceId/sessions/:sessionId — delete session
router.delete('/:workspaceId/sessions/:sessionId', requireAuth, async (req, res) => {
  const { workspaceId, sessionId } = req.params;
  const workspace = await verifyWorkspaceOwnership(workspaceId, req.user.id, res);
  if (!workspace) return;

  try {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    res.json({ success: true, message: 'Chat history deleted' });
  } catch (err) {
    console.error('Delete chat session error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete chat session' });
  }
});

// ============================================================
// POST /api/workspaces/:workspaceId/chat
// ============================================================

router.post('/:workspaceId/chat', requireAuth, async (req, res) => {
  const { workspaceId } = req.params;

  // 1. Verify workspace ownership
  const workspace = await verifyWorkspaceOwnership(workspaceId, req.user.id, res);
  if (!workspace) return;

  const { message, sessionId } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  // Ensure active session exists
  let currentSessionId = sessionId;
  if (!currentSessionId) {
    const { data: newSession } = await supabase
      .from('chat_sessions')
      .insert({
        workspace_id: workspaceId,
        title: message.trim().slice(0, 35) || 'New Chat',
      })
      .select('id, title')
      .single();
    if (newSession) currentSessionId = newSession.id;
  } else {
    // If it's a new chat, auto-update title from first message
    const { data: currentSession } = await supabase
      .from('chat_sessions')
      .select('title')
      .eq('id', currentSessionId)
      .single();

    if (currentSession && (currentSession.title === 'New Chat' || !currentSession.title)) {
      await supabase
        .from('chat_sessions')
        .update({
          title: message.trim().slice(0, 35),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentSessionId);
    } else {
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentSessionId);
    }
  }

  // 2. Insert user message immediately
  const userMsgPayload = {
    workspace_id: workspaceId,
    role: 'user',
    content: message.trim(),
  };
  if (currentSessionId) userMsgPayload.session_id = currentSessionId;

  const { data: userMsg, error: userMsgErr } = await supabase
    .from('chat_messages')
    .insert(userMsgPayload)
    .select('id, role, content, session_id, created_at')
    .single();

  if (userMsgErr) {
    console.error('Insert user message error:', userMsgErr);
    return res.status(500).json({ success: false, message: 'Failed to save message' });
  }

  try {
    // 3. Embed the question
    const queryEmbedding = await embedText(message.trim());

    // 4. Retrieve relevant chunks
    const chunks = await retrieveChunks(workspaceId, queryEmbedding);

    // 5. Check similarity threshold
    const relevantChunks = chunks.filter(c => (c.similarity || 0) > SIMILARITY_THRESHOLD);

    // 6. Build grounding prompt
    const contextText = relevantChunks.length > 0
      ? relevantChunks
          .map((c, i) => `[${i + 1}] (${c.filename}, chunk ${c.chunk_index}): ${c.content}`)
          .join('\n\n')
      : 'No specific document chunks matched.';

    const groundedPrompt = `You are an intelligent AI workspace assistant. You can answer questions using the provided context from documents, and you can also manage tasks and send messages using your tools (save_task, complete_task, list_tasks, send_discord_summary).
Current Timezone: Indian Standard Time (IST, UTC+05:30).

Context from documents:
${contextText}

User message / request:
${message.trim()}

Instructions:
- If the user asks to save, create, complete, close, or list tasks, call the appropriate tool.
- If answering questions about documents, use the provided context and cite source filenames and chunks when possible.
- Always present and format all dates, times, and timestamps in Indian Standard Time (IST, UTC+05:30) (e.g. "27 Sept 2026, 09:55 AM IST").
- If the user asks a general question not covered by the documents and not asking for a tool, inform them politely.`;

    // 7. Call Gemini with tool definitions
    let geminiResult = await callGemini(groundedPrompt, TOOL_DEFINITIONS);

    let finalText = '';
    let toolCallsMade = [];

    // 8. Handle tool calls if any
    const candidate = geminiResult?.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    const functionCallParts = parts.filter(p => p.functionCall);
    const textParts = parts.filter(p => p.text);

    if (functionCallParts.length > 0) {
      // Execute all tool calls
      const toolResults = [];
      for (const part of functionCallParts) {
        const fc = part.functionCall;
        const outcome = await handleToolCall(fc.name, fc.args || {}, workspaceId);
        toolResults.push({ name: fc.name, outcome });
        toolCallsMade.push({ name: fc.name, args: fc.args, ...outcome });
      }

      // Log tool trace in chat
      const toolPayload = {
        workspace_id: workspaceId,
        role: 'tool',
        content: JSON.stringify(toolResults),
      };
      if (currentSessionId) toolPayload.session_id = currentSessionId;
      await supabase.from('chat_messages').insert(toolPayload);

      // Re-call Gemini with tool results for final natural language reply
      const toolResultText = toolResults
        .map(r => `Tool ${r.name} result: ${JSON.stringify(r.outcome.result)}`)
        .join('\n');

      const followUpPrompt = `${groundedPrompt}

Tool results:
${toolResultText}

Please provide a natural language confirmation to the user incorporating the tool results.`;

      try {
        const followUp = await callGemini(followUpPrompt, []);
        finalText = followUp?.candidates?.[0]?.content?.parts
          ?.filter(p => p.text)
          ?.map(p => p.text)
          ?.join('') || '';
      } catch (err) {
        console.warn('Follow-up LLM response failed, using fallback summary:', err.message);
      }

      if (!finalText) {
        const successTools = toolResults.filter(t => t.outcome.status === 'success');
        if (successTools.length > 0) {
          finalText = `Action executed successfully: ${successTools.map(t => t.name.replace(/_/g, ' ')).join(', ')}.`;
        } else {
          finalText = 'I attempted to execute the action, but it encountered an error.';
        }
      }
    } else {
      finalText = textParts.map(p => p.text).join('') || "I couldn't generate a response.";
    }

    // 9. Extract citations from the answer text
    const citationRefs = [...finalText.matchAll(/\[(\d+)\]/g)].map(m => parseInt(m[1]) - 1);
    const citations = [...new Set(citationRefs)]
      .filter(i => i >= 0 && i < relevantChunks.length)
      .map(i => ({
        document_id: relevantChunks[i].document_id,
        filename: relevantChunks[i].filename,
        chunk_index: relevantChunks[i].chunk_index,
      }));

    // 10. Insert assistant message
    const assistantPayload = {
      workspace_id: workspaceId,
      role: 'assistant',
      content: finalText,
      citations,
    };
    if (currentSessionId) assistantPayload.session_id = currentSessionId;

    const { data: assistantMsg } = await supabase
      .from('chat_messages')
      .insert(assistantPayload)
      .select('id, role, content, citations, session_id, created_at')
      .single();

    res.json({
      success: true,
      data: {
        sessionId: currentSessionId,
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        chunks: relevantChunks.map(c => ({
          filename: c.filename,
          chunk_index: c.chunk_index,
          similarity: c.similarity,
        })),
        toolCalls: toolCallsMade,
      },
    });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to process chat message. Your question was saved.',
      userMessageId: userMsg.id,
    });
  }
});

// ============================================================
// GET /api/workspaces/:workspaceId/chat — get chat history
// ============================================================

router.get('/:workspaceId/chat', requireAuth, async (req, res) => {
  const { workspaceId } = req.params;
  const { sessionId } = req.query;

  const workspace = await verifyWorkspaceOwnership(workspaceId, req.user.id, res);
  if (!workspace) return;

  try {
    let query = supabase
      .from('chat_messages')
      .select('id, role, content, citations, session_id, created_at')
      .eq('workspace_id', workspaceId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: true });

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('Chat history error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat history' });
  }
});

export default router;
