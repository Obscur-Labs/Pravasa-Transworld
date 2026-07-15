import { Model } from 'mongoose';
import Country from '../models/Country';
import VisaType from '../models/VisaType';
import FormPreset from '../models/FormPreset';
import ContactLead from '../models/ContactLead';
import Application from '../models/Application';
import User from '../models/User';
import Trash, { TrashEntityType } from '../models/Trash';

// Registry mapping each trashable entity type to its Mongoose model.
export const TRASH_MODELS: Record<TrashEntityType, Model<any>> = {
  country: Country,
  visaType: VisaType,
  formPreset: FormPreset,
  contactLead: ContactLead,
  application: Application,
  user: User,
};

export const ENTITY_LABELS: Record<TrashEntityType, string> = {
  country: 'Country',
  visaType: 'Visa Type',
  formPreset: 'Form Preset',
  contactLead: 'Contact Lead',
  application: 'Application',
  user: 'Customer',
};

function deriveLabels(entityType: TrashEntityType, data: any): { label: string; sublabel: string } {
  switch (entityType) {
    case 'country':
      return { label: data.name || 'Country', sublabel: data.code || '' };
    case 'visaType':
      return { label: data.name || 'Visa Type', sublabel: '' };
    case 'formPreset':
      return { label: data.name || 'Form Preset', sublabel: data.description || '' };
    case 'contactLead':
      return { label: data.name || 'Lead', sublabel: data.email || '' };
    case 'application':
      return { label: data.referenceId || 'Application', sublabel: '' };
    case 'user':
      return { label: data.name || 'Customer', sublabel: data.email || '' };
    default:
      return { label: 'Record', sublabel: '' };
  }
}

/**
 * Snapshot a Mongoose document into the Trash collection and remove it from its
 * own collection. Returns the created trash item.
 */
export async function moveToTrash(entityType: TrashEntityType, doc: any) {
  const data = doc.toObject();
  const { label, sublabel } = deriveLabels(entityType, data);
  const trashItem = await Trash.create({
    entityType,
    label,
    sublabel,
    originalId: doc._id,
    data,
  });
  await doc.deleteOne();
  return trashItem;
}
