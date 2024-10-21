// src/utils/jwt.helper.ts
import { sign, verify } from 'jsonwebtoken';

const JWT_SECRET = 'your_jwt_secret'; // Replace with your actual secret

export const generateToken = (payload: object, expiresIn: string): string => {
  return sign(payload, JWT_SECRET, { expiresIn });
};

export const verifyToken = (token: string): object => {
  return verify(token, JWT_SECRET);
};
