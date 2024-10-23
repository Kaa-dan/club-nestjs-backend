import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { ForgotPasswordService } from './forgot-password.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Response } from 'express';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@Controller()
export class ForgotPasswordController {
  constructor(private readonly forgotPasswordService: ForgotPasswordService) {}

  @Post('forgot-password')
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Res() res: Response,
  ) {
    try {
      const response =
        await this.forgotPasswordService.changePassword(changePasswordDto);

      return res.status(HttpStatus.OK).json(response);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return res.status(HttpStatus.NOT_FOUND).json(error);
      }

      if (error instanceof BadRequestException) {
        return res.status(HttpStatus.BAD_REQUEST).json(error);
      }

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    }
  }
}
