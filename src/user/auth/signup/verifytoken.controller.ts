// src/auth/auth.controller.ts
import { Controller, Post, Headers, Res, HttpStatus } from '@nestjs/common';
import { VerifyToken } from './verifytoken.service';
import { Response } from 'express';

@Controller()
export class VerifyTokenController {
  constructor(private readonly verify_Token: VerifyToken) {}

  @Post('verify-token')
  async verifyToken(
    @Headers('authorization') authHeader: string, // Extract token from headers
    @Res() res: Response,
  ) {
    if (!authHeader) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        status: false,
        message: 'Authorization header missing',
      });
    }

    const token = authHeader.replace('Bearer ', ''); // Remove 'Bearer' prefix from the token

    try {
      // Call the service to verify the token
      const result = await this.verify_Token.verifyToken(token);

      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      // Handle errors thrown by the service
      return res.status(error.getStatus()).json(error.getResponse());
    }
  }

  @Post('verify-login')
  async verifyLogin(
    @Headers('authorization') authHeader: string,
    @Res() res: Response,
  ) {
    console.log(authHeader);
    
    try {
      const token = authHeader.replace('Bearer ', '');
      const response = await this.verify_Token.verifyLogin(token);
      return res.status(HttpStatus.OK).json(response);
    } catch (error) {

      if (error.name === 'TokenExpiredError') {
           res.status(HttpStatus.UNAUTHORIZED).json(error)
      } else if (error.name === 'JsonWebTokenError') {
         res.status(HttpStatus.UNAUTHORIZED).json(error)
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
          {
            status: false,
            message: 'Token verification failed',
          },
      
        );
      }

    }
  }
}
