const admin = require("firebase-admin");

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

async function requireAuth(req, res, next) {
  try {
    const idToken = getBearerToken(req);
    if (!idToken) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

function requireRole(requiredRole) {
  return async function requireRoleMiddleware(req, res, next) {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const snap = await admin.firestore().collection("roles").doc(req.user.uid).get();
      const role = snap.exists ? snap.data()?.role : null;

      req.user.role = role || null;

      const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const isAdmin = role === "admin";
      const requiresAdminExplicitly = requiredRoles.includes("admin");

      const allowed =
        requiredRoles.includes(role) ||
        (!requiresAdminExplicitly && isAdmin); // admin override for non-admin-only routes

      if (!allowed) {
        return res.status(403).json({ error: "Forbidden" });
      }

      return next();
    } catch (err) {
      return res.status(403).json({ error: "Forbidden" });
    }
  };
}

const requireAdmin = requireRole("admin");
const requireShop = requireRole("shop");
const requireBuyer = requireRole("buyer");

module.exports = { requireAuth, requireRole, requireAdmin, requireShop, requireBuyer };
