import {
  Controller,
  Body,
  Res,
  BadRequestException,
  HttpStatus,
  HttpCode,
  Post,
} from '@nestjs/common';
import { OtpService } from './otp.service';
import { Response } from 'express';

@Controller('resend-otp')
export class ResendController {
  constructor(private readonly otpService: OtpService) {}

  @Post()
  async resendOtp(@Body('email') email: string, @Res() res: Response) {
    try {
      const result = await this.otpService.resendOtp(email);
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
        });
      } else {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message,
        });
      }
    }
  }
}
