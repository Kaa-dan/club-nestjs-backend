// src/signup/signup.controller.ts
import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { SignupService } from './signup.service';
import { Response } from 'express';
import {
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

@Controller()
export class SignupController {
  constructor(private readonly signupService: SignupService) {}

  @Post('sign-up')
  async registerUser(
    @Body() createUser: CreateUserDto,
    @Res() res: Response,
  ) {
    try {
      
      // Use the SignupService to handle the registration
      const result = await this.signupService.signUp(createUser);
 
      // Return a success response
      return res.status(HttpStatus.CREATED).json(result);
    } catch (error) {
      console.log(error,"err");
      
      // Use instanceof to check for specific exceptions
      if (error instanceof ConflictException) {
        return res.status(HttpStatus.CONFLICT).json(error);
      } else {
        // Handle any other unanticipated errors
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          status: false,
          message: 'internal server error',
        });
      }
    }
  }
}
