import { Router } from 'express';
import { SaleController } from '../controllers/SaleController';

const router = Router();
const controller = new SaleController();

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);

export default router;
