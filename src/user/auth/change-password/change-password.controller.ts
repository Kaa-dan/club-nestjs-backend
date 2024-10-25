import {
  Body,
  Controller,
  Post,
  Headers,
  Res,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {TokenExpiredError} from 'jsonwebtoken'
import { ChangePasswordService } from './change-password.service';
import { Response } from 'express';
@Controller()
export class ChangePasswordController {
  constructor(private readonly changePasswordService: ChangePasswordService) {}

  @Post('/change-password')
  async changePassword(
    @Headers('authorization') authorization: string,
    @Body('password') password: string,
    @Res() res: Response,
  ) {
    try {
      const response = await this.changePasswordService.changePassword(
        password,
        authorization,
      );
     return res.status(HttpStatus.OK).json(response);
    } catch (error) {
      console.log(error,"errr");
      if (error instanceof TokenExpiredError) {
      return   res.status(401).json(error)
      }
      if (error instanceof BadRequestException) {
       return  res.status(HttpStatus.BAD_REQUEST).json(error);
      }

      if (error instanceof NotFoundException) {
      return   res.status(HttpStatus.NOT_FOUND).json(error);
      }
      
    return   res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    }
   
    
  
  }
}
