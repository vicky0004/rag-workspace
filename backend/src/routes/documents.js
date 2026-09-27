import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { PDFParse } from 'pdf-parse';
import supabase from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { verifyWorkspaceOwnership } from './workspaces.js';
import { embedText } from '../config/gemini.js';

const router = express.Router();

// Allowed extensions and their extraction method
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt', '.md']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type "${ext}". Allowed: .pdf, .txt, .md`));
    }
  },
});

// ============================================================
// Chunking helpers
// ============================================================

const CHUNK_SIZE = 2000; // ~500 tokens
const OVERLAP = 250;     // ~10-12% overlap

function chunkText(text) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - OVERLAP;
  }

  return chunks;
}

async function extractText(file) {
  const ext = '.' + file.originalname.split('.').pop().toLowerCase();

  if (ext === '.pdf') {
    const parser = new PDFParse({ data: file.buffer });
    const result = await parser.getText();
    const text = result?.text || '';
    if (!text.trim()) {
      throw new Error('PDF appears to be empty or image-only (no text layer)');
    }
    return text;
  }

  // .txt and .md — read as UTF-8
  return file.buffer.toString('utf-8');
}

// ============================================================
// POST /api/workspaces/:workspaceId/documents — upload & ingest
// ============================================================

router.post('/:workspaceId/documents', requireAuth, upload.single('file'), async (req, res) => {
  const { workspaceId } = req.params;

  // 1. Verify ownership
  const workspace = await verifyWorkspaceOwnership(workspaceId, req.user.id, res);
  if (!workspace) return;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  // 2. Compute sha256 hash
  const contentHash = crypto
    .createHash('sha256')
    .update(req.file.buffer)
    .digest('hex');

  // 3. Idempotency check — check if same hash already exists
  const { data: existing } = await supabase
    .from('documents')
    .select('id, filename, created_at, status')
    .eq('workspace_id', workspaceId)
    .eq('content_hash', contentHash)
    .maybeSingle();

  if (existing) {
    if (existing.status === 'ready') {
      return res.status(200).json({
        success: true,
        message: 'Document already exists and is ready',
        data: existing,
      });
    }
    // If previous attempt failed or was incomplete, delete it so we can re-process cleanly
    console.log(`[Upload] Re-processing existing failed document ${existing.id}`);
    await supabase.from('documents').delete().eq('id', existing.id);
  }

  // 4. Insert document record
  let doc, docErr;

  ({ data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      workspace_id: workspaceId,
      filename: req.file.originalname,
      content_hash: contentHash,
      status: 'processing',
    })
    .select('id, filename, created_at, status')
    .single());

  // Fallback if status column is absent in schema
  if (docErr && (docErr.code === 'PGRST204' || docErr.message?.includes('status'))) {
    console.warn('status column missing — run migration schema patches');
    ({ data: doc, error: docErr } = await supabase
      .from('documents')
      .insert({
        workspace_id: workspaceId,
        filename: req.file.originalname,
        content_hash: contentHash,
      })
      .select('id, filename, created_at')
      .single());
  }

  if (docErr) {
    console.error('Insert document error:', docErr);
    return res.status(500).json({ success: false, message: 'Failed to create document record' });
  }

  doc = { status: 'processing', ...doc };

  // 5. Respond immediately
  res.status(201).json({
    success: true,
    message: 'Document uploaded, processing started',
    data: doc,
  });

  // 6. Process asynchronously (chunk + embed + store)
  processDocument(doc.id, workspaceId, req.file).catch(err => {
    console.error(`Background processing failed for doc ${doc.id}:`, err);
  });
});

async function processDocument(documentId, workspaceId, file) {
  try {
    console.log(`[processDocument] START doc=${documentId} file=${file.originalname}`);

    // Extract text
    const text = await extractText(file);
    console.log(`[processDocument] extracted ${text.length} chars from ${file.originalname}`);

    if (!text.trim()) {
      throw new Error('Document appears to be empty');
    }

    // Chunk
    const chunks = chunkText(text);
    console.log(`[processDocument] chunked into ${chunks.length} chunks`);

    // Embed each chunk and collect rows
    const chunkRows = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`[processDocument] embedding chunk ${i + 1}/${chunks.length}...`);
      const embedding = await embedText(chunks[i]);
      chunkRows.push({
        workspace_id: workspaceId,
        document_id: documentId,
        chunk_index: i,
        content: chunks[i],
        embedding: JSON.stringify(embedding),
      });
    }

    console.log(`[processDocument] inserting ${chunkRows.length} chunks into DB...`);
    // Delete any old chunks for this document if retrying
    await supabase.from('chunks').delete().eq('document_id', documentId);

    // Batch insert chunks
    const { error: chunkErr } = await supabase
      .from('chunks')
      .insert(chunkRows);

    if (chunkErr) {
      console.error('[processDocument] Chunk insert error:', chunkErr);
      throw chunkErr;
    }

    // Update document status to 'ready'
    await supabase
      .from('documents')
      .update({ status: 'ready' })
      .eq('id', documentId)
      .then(({ error }) => {
        if (error) console.warn('Could not set status=ready:', error.message);
      });

    console.log(`[processDocument] SUCCESS doc=${documentId} (${chunks.length} chunks processed)`);
  } catch (err) {
    console.error(`[processDocument] FAILED doc=${documentId}:`, err.message);
    // Mark as failed
    await supabase
      .from('documents')
      .update({ status: 'failed' })
      .eq('id', documentId)
      .then(({ error }) => {
        if (error) console.warn('Could not set status=failed:', error.message);
      });
  }
}

// ============================================================
// GET /api/workspaces/:workspaceId/documents — list documents
// ============================================================

router.get('/:workspaceId/documents', requireAuth, async (req, res) => {
  const { workspaceId } = req.params;

  const workspace = await verifyWorkspaceOwnership(workspaceId, req.user.id, res);
  if (!workspace) return;

  try {
    let { data, error } = await supabase
      .from('documents')
      .select('id, filename, status, created_at, content_hash')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error && (error.code === '42703' || error.message?.includes('status'))) {
      ({ data, error } = await supabase
        .from('documents')
        .select('id, filename, created_at, content_hash')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false }));
      if (!error && data) {
        data = data.map(d => ({ ...d, status: 'ready' }));
      }
    }

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    console.error('List documents error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
});

// ============================================================
// DELETE /api/workspaces/:workspaceId/documents/:documentId
// ============================================================

router.delete('/:workspaceId/documents/:documentId', requireAuth, async (req, res) => {
  const { workspaceId, documentId } = req.params;

  const workspace = await verifyWorkspaceOwnership(workspaceId, req.user.id, res);
  if (!workspace) return;

  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
});

export default router;
