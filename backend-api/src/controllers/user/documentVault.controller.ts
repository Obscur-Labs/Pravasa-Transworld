import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import DocumentVault, { VaultDocumentType } from '../../models/DocumentVault';
import { uploadToCloudinary, deleteFromCloudinary, getSignedUrl } from '../../services/cloudinary.service';
import { extractFromDocument } from '../../services/ocr.service';
import { sendSuccess, sendError } from '../../utils/response';

export const getVaultDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  const docs = await DocumentVault.find({ user: req.user!._id }).sort({ createdAt: -1 });
  sendSuccess(res, docs);
};

export const uploadVaultDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { sendError(res, 'File is required'); return; }
  const { type, label } = req.body;
  if (!type || !label) { sendError(res, 'type and label are required'); return; }

  // Upload to Cloudinary
  const { url, publicId } = await uploadToCloudinary(req.file.buffer, 'document-vault');

  // Run OCR on supported document types
  let extractedData: Record<string, string> = {};
  const ocrTypes: VaultDocumentType[] = ['passport', 'aadhar', 'pan'];
  if (ocrTypes.includes(type as VaultDocumentType) && req.file.mimetype.startsWith('image/')) {
    try {
      const ocr = await extractFromDocument(req.file.buffer);
      if (ocr.name) extractedData.name = ocr.name;
      if (ocr.dateOfBirth) extractedData.dateOfBirth = ocr.dateOfBirth;
      if (ocr.documentNumber) extractedData.documentNumber = ocr.documentNumber;
      if (ocr.nationality) extractedData.nationality = ocr.nationality;
      if (ocr.expiryDate) extractedData.expiryDate = ocr.expiryDate;
      if (ocr.address) extractedData.address = ocr.address;
      if (ocr.fatherName) extractedData.fatherName = ocr.fatherName;
    } catch (err) {
      console.error('OCR failed:', err);
    }
  }

  const doc = await DocumentVault.create({
    user: req.user!._id,
    type,
    label,
    url,
    publicId,
    extractedData,
  });

  sendSuccess(res, doc, 'Document saved to vault', 201);
};

/**
 * Returns a 1-hour signed Cloudinary URL for a vault document.
 * The browser can open this URL directly without any Authorization header,
 * even if the Cloudinary account enforces authenticated delivery.
 */
export const getVaultDocumentUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = await DocumentVault.findOne({ _id: req.params.id, user: req.user!._id });
  if (!doc) { sendError(res, 'Document not found', 404); return; }
  const viewUrl = getSignedUrl(doc.url, doc.publicId);
  sendSuccess(res, { url: viewUrl });
};

export const deleteVaultDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const doc = await DocumentVault.findOne({ _id: req.params.id, user: req.user!._id });
  if (!doc) { sendError(res, 'Document not found', 404); return; }

  try { await deleteFromCloudinary(doc.publicId); } catch {}
  await doc.deleteOne();

  sendSuccess(res, null, 'Document deleted from vault');
};
