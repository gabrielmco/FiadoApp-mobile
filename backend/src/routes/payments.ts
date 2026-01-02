import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';

const router = Router();
const controller = new PaymentController();

router.get('/', controller.getAll);
router.post('/', controller.create);

export default router;
