import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/workspaces — list all workspaces for the authenticated user
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, name, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('List workspaces error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch workspaces' });
  }
});

// POST /api/workspaces — create a new workspace
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Workspace name is required' });
    }

    const { data, error } = await supabase
      .from('workspaces')
      .insert({ user_id: req.user.id, name: name.trim() })
      .select('id, name, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('Create workspace error:', err);
    res.status(500).json({ success: false, message: 'Failed to create workspace' });
  }
});

// PATCH /api/workspaces/:workspaceId — rename a workspace
router.patch('/:workspaceId', requireAuth, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Workspace name is required' });
    }

    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('user_id', req.user.id)
      .single();

    if (wsErr || !ws) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    const { data, error } = await supabase
      .from('workspaces')
      .update({ name: name.trim() })
      .eq('id', workspaceId)
      .select('id, name, created_at')
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('Update workspace error:', err);
    res.status(500).json({ success: false, message: 'Failed to rename workspace' });
  }
});

// DELETE /api/workspaces/:workspaceId — delete a workspace (only owner)
router.delete('/:workspaceId', requireAuth, async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Verify ownership first
    const { data: ws, error: wsErr } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('user_id', req.user.id)
      .single();

    if (wsErr || !ws) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) throw error;

    res.json({ success: true, message: 'Workspace deleted' });
  } catch (err) {
    console.error('Delete workspace error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete workspace' });
  }
});

/**
 * Helper: verify that workspaceId belongs to userId.
 * Returns the workspace row or throws/responds with 403.
 */
export async function verifyWorkspaceOwnership(workspaceId, userId, res) {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('id', workspaceId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    res.status(403).json({
      success: false,
      message: 'Forbidden: workspace not found or not owned by you',
    });
    return null;
  }

  return data;
}

export default router;
