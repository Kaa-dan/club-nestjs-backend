import { Body, Controller, Post, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express'; // Import Response type
import {  GoogleSignupService } from './google-signup.service';
import { GoogleAuthDto } from './dto/google-auth';
import { User } from 'src/shared/entities/user.entity';
import { ConflictException, InternalServerErrorException } from '@nestjs/common';

@Controller() 
export class GoogleSignupController {
  constructor(private readonly googleSignupService: GoogleSignupService) {}

  @Post('google-signup') 
  async googleSignUp(@Body() googleAuthDto: GoogleAuthDto, @Res() res: Response): Promise<Response> {
    try {
      
      
      const user = await this.googleSignupService.googleAuth(googleAuthDto);
      return res.status(HttpStatus.CREATED).json(user); 
    } catch (error) {
      if (error instanceof ConflictException) {
        return res.status(HttpStatus.CONFLICT).json(error); 
      }
      console.error('Error during Google signup:', error); 
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'An error occurred during signup', 
      });
    }
  }
}
