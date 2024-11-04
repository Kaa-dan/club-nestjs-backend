import {
  Controller,
  Post,
  Patch,
  Body,
  Res,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  HttpStatus,
  HttpCode,
  ConflictException,
} from '@nestjs/common';
import { OtpService } from './otp.service';
import { Response } from 'express'; // Import Response type from Express
import { SendOtpDto } from './dto/send-otp-dto';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';

@SkipAuth()
@Controller()
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async generateOtp(@Body() SendOtpDto: SendOtpDto, @Res() res: Response) {
    const { email } = SendOtpDto;
    try {
      const status = await this.otpService.generateAndStoreOtp(email);
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'OTP sent successfully',
        status,
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
        });
      } else if (error instanceof InternalServerErrorException) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An error occurred while generating OTP',
        });
      } else if (error instanceof ConflictException) {
        res.status(HttpStatus.CONFLICT).json(error);
      } else {
        // For any unexpected errors
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An unexpected error occurred',
        });
      }
    }
  }

  @Patch('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body('email') email: string,
    @Body('otp') otp: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.otpService.verifyOtp(email, otp);
      return res.status(HttpStatus.OK).json({
        statusCode: HttpStatus.OK,
        message: 'Email verified successfully',
        token: result.token, // Assuming the response includes the token
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message,
        });
      } else if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: error.message,
        });
      } else if (error instanceof InternalServerErrorException) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An error occurred while verifying OTP',
        });
      } else {
        // For any unexpected errors
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An unexpected error occurred',
        });
      }
    }
  }

  @Post('resend-otp') // Route for resending OTP
  async resendOtp(@Body() SendOtpDto: SendOtpDto, @Res() res: Response) {
    try {
      const { email } = SendOtpDto;
      // Call the service function to resend the OTP
      const result = await this.otpService.resendOtp(email);

      // Send success response with status 200
      return res.status(HttpStatus.OK).json({
        message: result.message,
      });
    } catch (error) {
      // If email is not provided or invalid, return 400 Bad Request
      if (error instanceof BadRequestException) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: error.message,
        });
      }

      // If there's a server error, return 500 Internal Server Error
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: 'Internal server error, please try again later.',
      });
    }
  }
}
