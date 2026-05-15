import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import supabase from "../db";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export class AuthController {
  static async register(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    try {
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email);
      if (checkError) {
        console.error("Check user error:", checkError);
        return res.status(500).json({ success: false, message: "Server error", details: checkError });
      }
      if (existingUsers && existingUsers.length > 0) {
        return res.status(400).json({ success: false, message: "Email already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const { data: result, error: insertError } = await supabase
        .from('users')
        .insert({ email, password_hash: passwordHash })
        .select('id');
      if (insertError) {
        console.error("Insert user error:", insertError);
        return res.status(500).json({ success: false, message: "Server error during registration", details: insertError });
      }

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        userId: result[0].id,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ success: false, message: "Server error during registration", details: error.message || error });
    }
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);
      if (error) {
        console.error("Login query error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
      }
      const user = users ? users[0] : null;

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