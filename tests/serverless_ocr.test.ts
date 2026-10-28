import test from 'node:test';
import assert from 'node:assert/strict';
import { RealOCRService } from '../services/real-ocr';
import { DocumentProcessingService } from '../services/document-processing';
import { dbStore } from '../lib/store';
import { DocumentRecord } from '../types';

test('Serverless OCR & Verification: Authentic Patta document analyzes instantly', async () => {
  const doc = dbStore.getDocuments().find(d => d.documentType === 'Patta') || dbStore.getDocuments()[0];
  const t0 = Date.now();
  const analysis = await RealOCRService.analyzeDocument(doc);
  const elapsed = Date.now() - t0;

  assert.ok(elapsed < 2000, `Expected elapsed < 2000ms, got ${elapsed}ms`);
  assert.equal(analysis.classification.isLandRecord, true);
  assert.equal(analysis.classification.isPatta, true);
  assert.ok(analysis.tokens.length > 0);
  assert.ok(analysis.extractedEntities.surveyNumber);

  const res = await DocumentProcessingService.processDocument(doc.id);
  assert.ok(res.document.status !== 'PROCESSING');
  assert.ok(res.record);
});

test('Serverless OCR & Verification: Invoice uploaded is flagged as Wrong Document', async () => {
  const invoiceDoc: DocumentRecord = {
    id: `doc-invoice-test-${Date.now()}`,
    fileName: 'commercial_tax_invoice_98214.jpg',
    fileSize: 1200000,
    mimeType: 'image/jpeg',
    filePath: '/documents/invoice_test.jpg',
    previewUrl: '/documents/invoice_test.jpg',
    fileUrl: '/documents/invoice_test.jpg',
    documentType: 'Patta',
    pages: 1,
    language: 'Tamil',
    state: 'Tamil Nadu',
    district: 'Madurai',
    taluk: 'Madurai North',
    village: 'Kovilur',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Testing Officer',
    status: 'UPLOADED',
    processingSteps: []
  };

  dbStore.addDocument(invoiceDoc);
  const analysis = await RealOCRService.analyzeDocument(invoiceDoc);

  assert.equal(analysis.classification.isLandRecord, false);
  assert.equal(analysis.classification.documentCategory, 'INVOICE_OR_BILL');
  assert.match(analysis.classification.rejectionReason || '', /Wrong Photo Uploaded/);

  const res = await DocumentProcessingService.processDocument(invoiceDoc.id);
  assert.equal(res.document.status, 'FLAGGED');
  assert.equal(res.record.status, 'REJECTED');
  assert.equal(res.record.validationResult?.overallStatus, 'FAILED');
});

test('Serverless Store: Disk cache persists documents across container reloads', () => {
  const testDocId = `doc-persist-${Date.now()}`;
  dbStore.addDocument({
    id: testDocId,
    fileName: 'test_persist_patta.pdf',
    fileSize: 500000,
    mimeType: 'application/pdf',
    filePath: '',
    previewUrl: '',
    fileUrl: '',
    documentType: 'Patta',
    pages: 1,
    language: 'Tamil',
    state: 'Tamil Nadu',
    district: 'Madurai',
    taluk: 'Madurai North',
    village: 'Kovilur',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Officer',
    status: 'UPLOADED',
    processingSteps: []
  });

  const retrieved = dbStore.getDocumentById(testDocId);
  assert.ok(retrieved, 'Expected document to be retrieved from store/disk cache');
  assert.equal(retrieved.id, testDocId);
});

test('Real User Scans: Haridwar Hindi Deed extracts real Devanagari words and NOT Tamil Muthuswami', async () => {
  const hindiDoc: DocumentRecord = {
    id: `doc-hindi-haridwar-${Date.now()}`,
    fileName: 'doc-6736_patta_3.jpeg.jpg',
    fileSize: 415401,
    mimeType: 'image/jpeg',
    filePath: '/documents/patta-3.jpg',
    previewUrl: '/documents/patta-3.jpg',
    fileUrl: '/documents/patta-3.jpg',
    documentType: 'Historical register',
    pages: 1,
    language: 'Hindi',
    state: 'Uttarakhand',
    district: 'Haridwar',
    taluk: 'Roorkee',
    village: 'Aurangabad',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Officer',
    status: 'UPLOADED',
    processingSteps: []
  };

  dbStore.addDocument(hindiDoc);
  const analysis = await RealOCRService.analyzeDocument(hindiDoc);
  assert.equal(analysis.classification.isLandRecord, true);
  assert.ok(analysis.rawText.includes('जिलाधिकारी, हरिद्वार'));
  assert.ok(analysis.rawText.includes('पतंजलि योगपीठ ट्रस्ट'));
  assert.ok(!analysis.rawText.includes('முத்துவேல்'), 'Should NOT contain Tamil Muthuvel');
  assert.equal(analysis.extractedEntities.landArea, 76.000);
  assert.equal(analysis.extractedEntities.district, 'Haridwar');
  assert.equal(analysis.extractedEntities.state, 'Uttarakhand');

  const res = await DocumentProcessingService.processDocument(hindiDoc.id);
  assert.ok(res.record.ownerName.value.includes('पतंजलि'));
  assert.equal(res.record.district.value, 'Haridwar');
  assert.equal(res.record.state.value, 'Uttarakhand');
});

test('Real User Scans: Vintage 1942 Cadastral Naksha extracts Hindi plot and area tokens', async () => {
  const nakshaDoc: DocumentRecord = {
    id: `doc-naksha-1942-${Date.now()}`,
    fileName: 'patta 4.jpeg',
    fileSize: 235427,
    mimeType: 'image/jpeg',
    filePath: '/documents/patta-4.jpg',
    previewUrl: '/documents/patta-4.jpg',
    fileUrl: '/documents/patta-4.jpg',
    documentType: 'Survey Settlement Register',
    pages: 1,
    language: 'Hindi',
    state: 'Rajasthan',
    district: 'Jaipur',
    taluk: 'Sadar',
    village: 'Mohalla Biraman',
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Officer',
    status: 'UPLOADED',
    processingSteps: []
  };

  const analysis = await RealOCRService.analyzeDocument(nakshaDoc);
  assert.equal(analysis.classification.isLandRecord, true);
  assert.ok(analysis.rawText.includes('नक्शा बाका मोहल्ला'));
  assert.ok(analysis.rawText.includes('घीसालाल वगैरह बीरामन'));
  assert.equal(analysis.extractedEntities.landArea, 322);
  assert.equal(analysis.extractedEntities.areaUnit, 'sq.ft');
});

