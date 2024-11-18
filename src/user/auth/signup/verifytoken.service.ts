// src/auth/auth.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { verifyToken } from 'src/utils';
import { HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/shared/entities/user.entity';
import { Model } from 'mongoose';

@Injectable()
export class VerifyToken {
  constructor(@InjectModel(User.name) private userModel: Model<User>) { }

  async verifyToken(token: string) {
    try {
      // Verify the token using the JWT service
      const decoded = verifyToken(token);

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

  async verifyLogin(token: string) {
    try {
      if (!token) {
        throw new BadRequestException('Token is required');
      }
      const decoded = verifyToken(token) as { email: string };
      const user = this.userModel
        .findOne({ email: decoded.email })
        .select('-password');
      return {
        status: true,
        user,
      };
    } catch (error) {
      throw error;
    }
  }
}
