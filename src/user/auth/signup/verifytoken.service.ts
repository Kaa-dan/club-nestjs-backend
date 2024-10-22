// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { verifyToken } from 'src/utils';
import { HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class VerifyToken {
  constructor() {}

  async verifyToken(token: string) {
    try {
      // Verify the token using the JWT service
      const decoded = verifyToken(token)
       console.log();
       
      return {
        status: true,
        message: 'Token is valid',
        data: decoded,
      };
    } catch (error) {
        
      // Handle specific JWT errors
      if (error.name === 'TokenExpiredError') {
        throw new HttpException(
          {
            status: false,
            message: 'Token has expired',
          },
          HttpStatus.UNAUTHORIZED,
        );
      } else if (error.name === 'JsonWebTokenError') {
        throw new HttpException(
          {
            status: false,
            message: 'Invalid token',
          },
          HttpStatus.UNAUTHORIZED,
        );
      } else {
        throw new HttpException(
          {
            status: false,
            message: 'Token verification failed',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
