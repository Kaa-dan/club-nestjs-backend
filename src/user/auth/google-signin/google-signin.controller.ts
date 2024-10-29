import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import { GoogleSigninService } from './google-signin.service';
import { Response } from 'express';
import { GoogleAuthDto } from '../google-signup/dto/google-auth';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';

@SkipAuth()
@Controller()
export class GoogleSigninController {
  constructor(private readonly googleSignInService: GoogleSigninService) {}
  @Post('/google-signin')
  async googleSinIn(@Res() res: Response, @Body() loginData:GoogleAuthDto) {
    try {
        const response = await this.googleSignInService.googleLogin(loginData);
        res.status(HttpStatus.OK).json(response)
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(error);
    }
  }
}
