import express from 'express';
import {
  getUsers, createUser, updateUser, deleteUser,
  getRoles, createRole, updateRole, deleteRole
} from '../controllers/userController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { requirePermission } from '../middlewares/rbacMiddleware.js';

const router = express.Router();

router.use(authenticate);

// Users
router.get('/', requirePermission('user:read'), getUsers);
router.post('/', requirePermission('user:create'), createUser);
router.put('/:id', requirePermission('user:update'), updateUser);
router.delete('/:id', requirePermission('user:delete'), deleteUser);

// Roles
router.get('/roles/list', requirePermission('user:read'), getRoles);
router.post('/roles/create', requirePermission('user:create'), createRole);
router.put('/roles/:id', requirePermission('user:update'), updateRole);
router.delete('/roles/:id', requirePermission('user:delete'), deleteRole);

export default router;
