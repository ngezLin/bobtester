import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export class AuthController {
  static async register(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    try {
      const [existingUsers]: any = await pool.execute("SELECT id FROM users WHERE email = ?", [email]);
      if (existingUsers.length > 0) {
        return res.status(400).json({ success: false, message: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const [result]: any = await pool.execute(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        [email, passwordHash]
      );

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        userId: result.insertId,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ success: false, message: "Server error during registration" });
    }
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    try {
      const [users]: any = await pool.execute("SELECT * FROM users WHERE email = ?", [email]);
      const user = users[0];

      if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN as any,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
        user: { id: user.id, email: user.email },
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ success: false, message: "Server error during login" });
    }
  }
}
