import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { verify, JwtPayload } from 'jsonwebtoken'
import { ENV } from 'src/utils/config/env.config';
import { Reflector } from '@nestjs/core';
import { SKIP_AUTH_KEY } from 'src/decorators/skip-auth.decorator';

@Injectable()
export class JwtVerifyGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
    ) { }
    canActivate(context: ExecutionContext): boolean {
        const request: Request = context.switchToHttp().getRequest();

        console.log(context.getHandler())
        console.log(context.getClass())

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
            const payload = verify(token, ENV.JWT_SECRET) as JwtPayload
            request['user'] = payload; // Attach user information to the request
            return true; // Allow the request to proceed
        } catch (error) {
            throw new Error('Token verification failed: ' + error.message);
        }
    }
}
