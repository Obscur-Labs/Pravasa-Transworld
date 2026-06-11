import { Response } from 'express';
import { AdminRequest } from '../../middleware/adminAuth.middleware';
import FormPreset from '../../models/FormPreset';
import { sendSuccess, sendError } from '../../utils/response';

export const getFormPresets = async (_req: AdminRequest, res: Response): Promise<void> => {
  const presets = await FormPreset.find().sort({ updatedAt: -1 });
  sendSuccess(res, presets);
};

export const createFormPreset = async (req: AdminRequest, res: Response): Promise<void> => {
  const { name, description, formFields, documentRequirements } = req.body;
  if (!name) { sendError(res, 'Preset name is required'); return; }
  const preset = await FormPreset.create({
    name,
    description: description || '',
    formFields: formFields || [],
    documentRequirements: documentRequirements || [],
  });
  sendSuccess(res, preset, 'Form preset saved', 201);
};

export const updateFormPreset = async (req: AdminRequest, res: Response): Promise<void> => {
  const preset = await FormPreset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!preset) { sendError(res, 'Form preset not found', 404); return; }
  sendSuccess(res, preset, 'Form preset updated');
};

export const deleteFormPreset = async (req: AdminRequest, res: Response): Promise<void> => {
  const preset = await FormPreset.findByIdAndDelete(req.params.id);
  if (!preset) { sendError(res, 'Form preset not found', 404); return; }
  sendSuccess(res, null, 'Form preset deleted');
};
