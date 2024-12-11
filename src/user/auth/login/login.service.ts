import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  Res,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express'; // Add this import
import { LoginDto } from './dto/login.sto';
import { User } from 'src/shared/entities/user.entity';
import { comparePasswords, generateToken } from 'src/utils';
import { ENV } from 'src/utils/config/env.config';

@Injectable()
export class LoginService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) { }

  async login(
    @Res({ passthrough: true }) response: Response,
    loginDto: LoginDto,
  ): Promise<{ status: boolean; message: string; token?: string; data: any }> {
    const { email, password } = loginDto;
    try {
      (email);
      // Check if the user exists
      const user = await this.userModel.findOne({ email });

      if (!user) {
        throw new BadRequestException('No user found with this email address');
      }

      // Check if the email is verified
      if (!user.emailVerified) {
        throw new ForbiddenException(
          'Please verify your email address to log in',
        );
      }

      // Verify the password
      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password provided');
      }

      // Check if the user is blocked
      if (user.isBlocked) {
        throw new UnauthorizedException('Your account is currently blocked');
      }

      // Generate JWT token
      const token = generateToken(
        { email: user.email, id: user._id },
        ENV.TOKEN_EXPIRY_TIME,
      );

      const sanitizedUser = JSON.parse(JSON.stringify(user));
      delete sanitizedUser.password;

      ('setting COKKIE');

      response.cookie('auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      ('SETTED COKKIE');
      return {
        status: true,
        message: 'Login successful',
        token,
        data: sanitizedUser,
      };
    } catch (error) {
      (error);
      throw error;
    }
  }
}
