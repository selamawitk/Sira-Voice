export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.warn("AuthorizeRoles: No user found on request.");
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      console.warn(`AuthorizeRoles: User role '${req.user.role}' not in allowed list [${roles.join(', ')}]`);
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }

    next();
  };
};