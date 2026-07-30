import { Response } from 'express';
import { AdminRequest } from '../../middleware/adminAuth.middleware';
import FormPreset from '../../models/FormPreset';
import { sendSuccess, sendError } from '../../utils/response';
import { moveToTrash } from '../../utils/trash';
import { logActivity } from '../../utils/activityLog';
import { normalizeFormItems } from '../../utils/formItems';

export const getFormPresets = async (_req: AdminRequest, res: Response): Promise<void> => {
  const presets = await FormPreset.find().sort({ updatedAt: -1 });
  sendSuccess(res, presets);
};

export const createFormPreset = async (req: AdminRequest, res: Response): Promise<void> => {
  const { name, description } = req.body;
  if (!name) { sendError(res, 'Preset name is required'); return; }
  const { formFields, documentRequirements } = normalizeFormItems(req.body);
  const preset = await FormPreset.create({
    name,
    description: description || '',
    formFields: formFields || [],
    documentRequirements: documentRequirements || [],
  });
  logActivity(req, 'create', 'Form Preset', name);
  sendSuccess(res, preset, 'Form preset saved', 201);
};

export const updateFormPreset = async (req: AdminRequest, res: Response): Promise<void> => {
  const preset = await FormPreset.findByIdAndUpdate(req.params.id, normalizeFormItems({ ...req.body }), { new: true, runValidators: true });
  if (!preset) { sendError(res, 'Form preset not found', 404); return; }
  logActivity(req, 'update', 'Form Preset', preset.name);
  sendSuccess(res, preset, 'Form preset updated');
};

export const deleteFormPreset = async (req: AdminRequest, res: Response): Promise<void> => {
  const preset = await FormPreset.findById(req.params.id);
  if (!preset) { sendError(res, 'Form preset not found', 404); return; }
  await moveToTrash('formPreset', preset);
  logActivity(req, 'delete', 'Form Preset', preset.name);
  sendSuccess(res, null, 'Form preset moved to trash');
};
