import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { verifyWorkspaceOwnership } from './workspaces.js';

const router = express.Router();

// GET /api/workspaces/:workspaceId/dashboard — aggregated dashboard data
router.get('/:workspaceId/dashboard', requireAuth, async (req, res) => {
  const { workspaceId } = req.params;

  const workspace = await verifyWorkspaceOwnership(workspaceId, req.user.id, res);
  if (!workspace) return;

  try {
    const [documents, toolCalls, tasks] = await Promise.all([
      supabase
        .from('documents')
        .select('id, filename, status, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),
      supabase
        .from('tool_calls')
        .select('id, tool_name, args, status, result, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('tasks')
        .select('id, title, status, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }),
    ]);

    if (documents.error) throw documents.error;
    if (toolCalls.error) throw toolCalls.error;
    if (tasks.error) throw tasks.error;

    res.json({
      success: true,
      data: {
        workspace,
        documents: documents.data,
        toolCalls: toolCalls.data,
        tasks: tasks.data,
      },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

// GET /api/workspaces/:workspaceId/tasks — list tasks
router.get('/:workspaceId/tasks', requireAuth, async (req, res) => {
  const { workspaceId } = req.params;

  const workspace = await verifyWorkspaceOwnership(workspaceId, req.user.id, res);
  if (!workspace) return;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, status, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('Tasks error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
});

// PATCH /api/workspaces/:workspaceId/tasks/:taskId — update task status or title
router.patch('/:workspaceId/tasks/:taskId', requireAuth, async (req, res) => {
  const { workspaceId, taskId } = req.params;
  const { status, title } = req.body;

  const workspace = await verifyWorkspaceOwnership(workspaceId, req.user.id, res);
  if (!workspace) return;

  try {
    const updates = {};
    if (status) updates.status = status;
    if (title) updates.title = title;

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('workspace_id', workspaceId)
      .select('id, title, status, created_at')
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
});

// DELETE /api/workspaces/:workspaceId/tasks/:taskId — delete task
router.delete('/:workspaceId/tasks/:taskId', requireAuth, async (req, res) => {
  const { workspaceId, taskId } = req.params;

  const workspace = await verifyWorkspaceOwnership(workspaceId, req.user.id, res);
  if (!workspace) return;

  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
});

export default router;
