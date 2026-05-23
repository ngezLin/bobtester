import jwt from "jsonwebtoken";
import { jwtSecret } from "./config";

export type JwtPayload = {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
};

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: "15m",
  });
}

export function signRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: "30d",
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, jwtSecret) as JwtPayload;
}
