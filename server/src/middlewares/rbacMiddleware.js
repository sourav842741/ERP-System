export const requirePermission = (...permissionCodes) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN',
        message: 'No role assigned to user account.'
      });
    }

    const role = req.user.role;

    // Super Admin has unrestricted system privileges
    if (role.name === 'Super Admin') {
      return next();
    }

    const permissions = role.permissions || [];
    const hasPerm = permissionCodes.some((code) => permissions.includes(code));
    if (!hasPerm) {
      return res.status(403).json({
        success: false,
        code: 'PERMISSION_DENIED',
        message: `You lack required permission: [${permissionCodes.join(' or ')}] to perform this operation.`
      });
    }

    next();
  };
};
