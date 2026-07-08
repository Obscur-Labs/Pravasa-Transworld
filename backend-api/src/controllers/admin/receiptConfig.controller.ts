import { Response } from 'express';
import { AdminRequest } from '../../middleware/adminAuth.middleware';
import ReceiptConfig from '../../models/ReceiptConfig';
import { generateReceiptPDF, ReceiptData } from '../../services/pdf.service';
import { getCompanyInfo } from '../../utils/receiptData';
import { logActivity } from '../../utils/activityLog';
import { sendSuccess } from '../../utils/response';

const EDITABLE_FIELDS = [
  'companyName', 'addressLine1', 'addressLine2', 'phone', 'fax', 'email',
  'gstin', 'pan', 'stateName', 'stateCode', 'sacCode', 'logoUrl',
] as const;

export const getReceiptConfig = async (_req: AdminRequest, res: Response): Promise<void> => {
  const config = await ReceiptConfig.findOneAndUpdate({}, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
  sendSuccess(res, config);
};

export const updateReceiptConfig = async (req: AdminRequest, res: Response): Promise<void> => {
  const update: Record<string, string> = {};
  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) update[field] = String(req.body[field]);
  }
  const config = await ReceiptConfig.findOneAndUpdate({}, update, { upsert: true, new: true, setDefaultsOnInsert: true });
  logActivity(req, 'update', 'Receipt Config', config.companyName);
  sendSuccess(res, config, 'Receipt settings updated');
};

// Generates a receipt from synthetic data (no real payment involved) so an admin can
// preview the printed layout — one demo covers the corporate/tax-invoice format, since
// it's the superset of what an individual receipt shows.
export const downloadDemoReceipt = async (_req: AdminRequest, res: Response): Promise<void> => {
  const company = await getCompanyInfo();

  const demoData: ReceiptData = {
    payment: {
      _id: 'DEMO0000PREVIEW',
      amount: 3280,
      discountApplied: 0,
      promoCode: null,
      paidAt: new Date(),
    } as any,
    appRef: 'PRS-DEMO-1234',
    userName: 'John Sample Doe',
    visaType: 'Tourist Visa',
    visaCategory: 'tourist',
    country: 'Singapore',
    receiptNumber: 'SG-1234-26-001',
    adults: 2,
    children: 0,
    adultBase: 2100,
    adultFee: 1000,
    childBase: 0,
    childFee: 0,
    accountType: 'corporate',
    clientGstin: '24ACEFA0900H1Z3',
    passportNumber: 'A1234567',
    visaNumber: 'UB812139SA11762026',
    company,
  };

  const pdfBuffer = await generateReceiptPDF(demoData);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="receipt-demo.pdf"');
  res.end(pdfBuffer);
};
