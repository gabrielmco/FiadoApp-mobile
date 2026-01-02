import { Router } from 'express';
import { ClientController } from '../controllers/ClientController';

const router = Router();
const controller = new ClientController();

router.get('/', controller.getAll);
router.post('/', controller.create);
router.put('/:id', controller.update);

export default router;
