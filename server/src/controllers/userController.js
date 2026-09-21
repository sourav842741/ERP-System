import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { DEFAULT_PERMISSIONS } from '../config/constants.js';
import { createNotification } from '../services/notificationService.js';
import { logAudit } from '../middlewares/auditMiddleware.js';

// ================= USER CONTROLLERS =================
export const getUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    const query = { isDeleted: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const users = await User.find(query).populate('role').select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: { users } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, phone, roleId, status } = req.body;
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: roleId,
      status: status || 'active'
    });

    await logAudit({
      req,
      action: 'USER_CREATED',
      module: 'Employees & Roles',
      entityId: user._id,
      newValue: { email, name, roleId },
      reason: 'Admin added employee'
    });

    const populated = await User.findById(user._id).populate('role').select('-password');

    createNotification({
      title: 'New Team Member Onboarded',
      message: `${name} (${email}) has been added to the team as ${populated?.role?.name || 'Staff'}.`,
      type: 'USER_ADDED',
      link: '/employees',
      targetUser: user._id,
      metadata: {
        employeeName: name,
        employeeEmail: email,
        assignedRole: populated?.role?.name || 'Staff',
        status: status || 'active',
        addedBy: req.user?.name || 'Administrator'
      }
    });

    res.status(201).json({ success: true, message: 'User created successfully', data: { user: populated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, roleId, status, password } = req.body;

    const user = await User.findById(id);
    if (!user || user.isDeleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (roleId) user.role = roleId;
    if (status) user.status = status;
    if (password) user.password = password;

    await user.save();

    await logAudit({
      req,
      action: 'USER_UPDATED',
      module: 'Employees & Roles',
      entityId: user._id,
      reason: 'User profile/role updated'
    });

    const updated = await User.findById(id).populate('role').select('-password');
    res.json({ success: true, message: 'User updated successfully', data: { user: updated } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isDeleted = true;
    user.status = 'inactive';
    await user.save();

    await logAudit({
      req,
      action: 'USER_DELETED',
      module: 'Employees & Roles',
      entityId: id,
      reason: 'User soft deleted'
    });

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================= ROLE & PERMISSION CONTROLLERS =================
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: 1 });
    res.json({ success: true, data: { roles, availablePermissions: DEFAULT_PERMISSIONS } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const existing = await Role.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Role with this name already exists' });
    }

    const role = await Role.create({
      name,
      description: description || '',
      permissions: permissions || [],
      isSystem: false
    });

    await logAudit({
      req,
      action: 'ROLE_CREATED',
      module: 'Employees & Roles',
      entityId: role._id,
      newValue: { name, permissions },
      reason: 'Custom role created'
    });

    res.status(201).json({ success: true, message: 'Role created successfully', data: { role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    const oldPermissions = [...role.permissions];
    if (name && !role.isSystem) role.name = name;
    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;

    await role.save();

    await logAudit({
      req,
      action: 'ROLE_UPDATED',
      module: 'Employees & Roles',
      entityId: id,
      oldValue: oldPermissions,
      newValue: permissions,
      reason: 'Role permissions updated'
    });

    res.json({ success: true, message: 'Role updated successfully', data: { role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findById(id);
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    if (role.isSystem) {
      return res.status(400).json({ success: false, message: 'System protected roles cannot be deleted' });
    }

    // Check if any users are assigned
    const assignedUsers = await User.countDocuments({ role: id, isDeleted: false });
    if (assignedUsers > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. ${assignedUsers} active user(s) are currently assigned to this role.`
      });
    }

    await Role.findByIdAndDelete(id);

    await logAudit({
      req,
      action: 'ROLE_DELETED',
      module: 'Employees & Roles',
      entityId: id,
      reason: 'Role deleted'
    });

    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
