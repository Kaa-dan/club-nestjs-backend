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
  } from '@nestjs/common';
  import { OtpService } from './otp.service';
  import { Response } from 'express'; // Import Response type from Express
import { SendOtpDto } from './dto/send-otp-dto';
  
  @Controller()
  export class OtpController {
    constructor(private readonly otpService: OtpService) {}
  
    @Post('send-otp')
    @HttpCode(HttpStatus.OK)
    async generateOtp(@Body('email') email : SendOtpDto, @Res() res: Response) {
      try {
        const token = await this.otpService.generateAndStoreOtp(email);
        return res.status(HttpStatus.OK).json({
          statusCode: HttpStatus.OK,
          message: 'OTP sent successfully',
          token,
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
    async verifyOtp(@Body('email') email: SendOtpDto, @Body('otp') otp: string, @Res() res: Response) {
        console.log(otp,email)
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
  }
  