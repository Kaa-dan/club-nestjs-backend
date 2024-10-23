// src/utils/jwt.helper.ts
import { sign, verify } from 'jsonwebtoken';

import { ENV } from './config/env.config';
export const generateToken = (payload: object, expiresIn: string): string => {
  return sign(payload, ENV.JWT_SECRET, { expiresIn });
};

export const verifyToken = (token: string): object => {
  return verify(token, ENV.JWT_SECRET);
};
