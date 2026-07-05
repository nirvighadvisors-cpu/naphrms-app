import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getOnboardingStatus,
  updatePersonalInfo,
  updateAddress,
  updateEmergencyContact,
  updateBankDetails,
  uploadDocument,
  signOfferLetter,
  submitOfferDetails,
  completeOnboarding,
  completeDocumentsStep,
} from './onboarding.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// All onboarding routes require authentication
router.use(authenticate);

router.get('/status', getOnboardingStatus);
router.patch('/personal', updatePersonalInfo);
router.patch('/address', updateAddress);
router.patch('/emergency', updateEmergencyContact);
router.patch('/bank', updateBankDetails);
router.post('/documents', upload.single('file'), uploadDocument);
router.post('/documents-complete', completeDocumentsStep);
router.post('/sign-offer', signOfferLetter);
router.patch('/offer-details', submitOfferDetails);
router.post('/complete', completeOnboarding);

export default router;
