import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { verify, JwtPayload } from 'jsonwebtoken';
import { ENV } from 'src/utils/config/env.config';
import { Reflector } from '@nestjs/core';
import { SKIP_AUTH_KEY } from 'src/decorators/skip-auth.decorator';
import { Model } from 'mongoose';
import { User } from 'src/shared/entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectModel(User.name) private readonly usersModel: Model<User>, // Inject UserService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();

    // Check if the route or its controller/module has @SkipAuth() applied
    const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAuth) {
      return true; // Skip JWT verification if @SkipAuth is applied
    }

    const token = request.headers.authorization?.split(' ')[1]; // Get token from Authorization header

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload = verify(token, ENV.JWT_SECRET) as JwtPayload;
      const userId = payload.id;

      // Query the UserService to find the user by ID
      const user = await this.usersModel.findById(userId);

      if (!user) {
        throw new ForbiddenException('User does not exist');
      }

      request['user'] = user; // Attach user information to the request
      return true; // Allow the request to proceed
    } catch (error) {
      throw new UnauthorizedException(
        'Token verification failed: ' + error.message,
      );
    }
  }
}
