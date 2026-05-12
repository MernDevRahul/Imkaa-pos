"use strict";

const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { body } = require("express-validator");
const { authenticate, authorize } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { prisma } = require("../utils/prisma");
const { ok, created, fail } = require("../utils/response");

router.use(authenticate, authorize("ADMIN"));

const SAFE_SELECT = {
  id: true,
  name: true,
  username: true,
  role: true,
  isActive: true,
  createdAt: true,
};

// GET /api/v1/users
router.get("/", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: SAFE_SELECT,
      orderBy: { name: "asc" },
    });
    ok(res, users);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/users
router.post(
  "/",
  [
    body("username")
      .trim()
      .notEmpty()
      .withMessage("Username is required")
      .matches(/^[a-z0-9_]+$/)
      .withMessage("Username: lowercase letters, numbers and _ only"),
    body("name").trim().notEmpty().withMessage("Full name is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role")
      .isIn(["ADMIN", "MANAGER", "CASHIER"])
      .withMessage("Role must be ADMIN, MANAGER, or CASHIER"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { username, name, password, role } = req.body;
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { username, name, passwordHash, role },
        select: SAFE_SELECT,
      });
      created(res, user, "User created");
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /api/v1/users/:id
router.patch(
  "/:id",
  [
    body("name").optional().trim().notEmpty(),
    body("role").optional().isIn(["ADMIN", "MANAGER", "CASHIER"]),
    body("password")
      .optional()
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("isActive").optional().isBoolean(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { name, role, password, isActive } = req.body;
      const data = {};
      if (name !== undefined) data.name = name;
      if (role !== undefined) data.role = role;
      if (isActive !== undefined) data.isActive = isActive;
      if (password) data.passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data,
        select: SAFE_SELECT,
      });
      ok(res, user, "User updated");
    } catch (err) {
      next(err);
    }
  },
);

// Deactivate 
router.patch("/:id/deactivate", async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
      select: SAFE_SELECT,
    });
    ok(res, user, "User deactivated");
  } catch (err) {
    next(err);
  }
});

// Activate
router.patch("/:id/activate", async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: true },
      select: SAFE_SELECT,
    });
    ok(res, user, "User activated");
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/users/:id  (deactivate, not hard delete)
router.delete("/:id", async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return fail(res, "Cannot deactivate your own account", 400);
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
      select: SAFE_SELECT,
    });
    ok(res, user, "User deactivated");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
