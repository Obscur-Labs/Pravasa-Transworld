import { Schema, Document } from 'mongoose';
import { encryptData, decryptData } from '../utils/encryption';

export interface EncryptionPluginOptions {
  fields: string[]; // List of fields (that are of type Map) to encrypt
}

/**
 * Mongoose plugin to automatically encrypt/decrypt values in Map fields.
 * Encrypts data in `pre('save')` and decrypts in `post('init')`.
 */
export function encryptionPlugin(schema: Schema, options: EncryptionPluginOptions) {
  const { fields } = options;

  if (!fields || fields.length === 0) {
    return;
  }

  // Intercept right before saving to DB
  schema.pre('save', function (next) {
    const doc = this;

    fields.forEach((field) => {
      // get() returns the Map or object for the field
      const mapOrObj = doc.get(field);
      
      if (mapOrObj instanceof Map) {
        // Iterate through all keys and encrypt their values
        for (const [key, value] of mapOrObj.entries()) {
          if (typeof value === 'string') {
            mapOrObj.set(key, encryptData(value));
          }
        }
      } else if (mapOrObj && typeof mapOrObj === 'object') {
        const obj = mapOrObj as Record<string, any>;
        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === 'string') {
            obj[key] = encryptData(obj[key]);
          }
        }
      }
    });

    next();
  });

  // Intercept right after loading from DB
  schema.post('init', function (doc: Document) {
    fields.forEach((field) => {
      const mapOrObj = doc.get(field);

      if (mapOrObj instanceof Map) {
        for (const [key, value] of mapOrObj.entries()) {
          if (typeof value === 'string') {
            mapOrObj.set(key, decryptData(value));
          }
        }
      } else if (mapOrObj && typeof mapOrObj === 'object') {
        const obj = mapOrObj as Record<string, any>;
        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === 'string') {
            obj[key] = decryptData(obj[key]);
          }
        }
      }
    });
  });
}
