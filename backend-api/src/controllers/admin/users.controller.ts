import { Response } from 'express';
import https from 'https';
import http from 'http';
import archiver from 'archiver';
import { AdminRequest } from '../../middleware/adminAuth.middleware';
import DocumentVault from '../../models/DocumentVault';
import User from '../../models/User';
import { sendSuccess, sendError } from '../../utils/response';

async function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https://') ? https : http;
    const chunks: Buffer[] = [];
    const req = protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

export const getUserVaultDocuments = async (req: AdminRequest, res: Response): Promise<void> => {
  const docs = await DocumentVault.find({ user: req.params.userId }).sort({ createdAt: -1 });
  sendSuccess(res, docs);
};

export const downloadUserVaultZip = async (req: AdminRequest, res: Response): Promise<void> => {
  const docs = await DocumentVault.find({ user: req.params.userId }).sort({ createdAt: -1 });

  if (docs.length === 0) {
    sendError(res, 'No vault documents found for this user', 404);
    return;
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="vault-documents.zip"');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  const archive = archiver('zip', { zlib: { level: 6 } });

  const closePromise = new Promise<void>((resolve, reject) => {
    archive.on('close', resolve);
    archive.on('error', reject);
  });

  archive.pipe(res);

  for (const doc of docs) {
    try {
      const buffer = await fetchBuffer(doc.url);
      const urlPath = doc.url.split('?')[0];
      const ext = urlPath.split('.').pop() || 'bin';
      const safeName = doc.label.replace(/[^a-zA-Z0-9\-_]/g, '_');
      archive.append(buffer, { name: `${safeName}_${String(doc._id).slice(-6)}.${ext}` });
    } catch (err) {
      console.error(`Skipping vault doc ${doc._id}:`, err);
    }
  }

  archive.finalize();
  await closePromise;
};

export const togglePromoApplicable = async (req: AdminRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.params.userId);
  if (!user) { sendError(res, 'User not found', 404); return; }
  user.promoApplicable = !user.promoApplicable;
  await user.save();
  sendSuccess(res, { _id: user._id, promoApplicable: user.promoApplicable });
};
