"use strict";

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../utils/prisma");

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  role: true,
  isActive: true,
  createdAt: true,
};

async function login(req,res) {
      const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) return null;

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return null;

  // Sign JWT
  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
  );

  // Store token in cookie
  res.cookie("imkaaPos", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
    });

  // Audit log
  await prisma.auditLog.create({
    data: { userId: user.id, action: "LOGIN" },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
    },
  };
}

async function logout(req,res) {
  const userId = req.user.id
  await prisma.auditLog.create({
    data: { userId, action: "LOGOUT" },
  });
  res.clearCookie("imkaaPos", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
}


async function getMe(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_USER_SELECT,
  });
}

module.exports = { login, logout, getMe };
