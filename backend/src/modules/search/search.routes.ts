import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { globalSearch } from './search.controller';

const router = Router();

router.use(authenticate);

router.get('/', globalSearch);

export default router;
