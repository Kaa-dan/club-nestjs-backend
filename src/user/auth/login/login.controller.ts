import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express'; // Import Express Response type
import { LoginService } from './login.service'; // Import the LoginService
import { LoginDto } from './dto/login.sto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common'; // Import necessary exceptions
import { SkipAuth } from 'src/decorators/skip-auth.decorator';

@SkipAuth()
@Controller('login')
export class LoginController {
  constructor(private readonly loginService: LoginService) { }

  @Post()
  async login(@Body() loginDto: LoginDto, @Res() response: Response) {
    try {
      ({ loginDto });
      // Call the login service to authenticate the user
      const result = await this.loginService.login(response, loginDto);
      return response.status(HttpStatus.OK).json(result); // Return the response with 200 OK
    } catch (error) {
      // Handle errors thrown by the service
      if (error instanceof BadRequestException) {
        return response
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: error.message }); // Return 400
      } else if (error instanceof UnauthorizedException) {
        return response
          .status(HttpStatus.UNAUTHORIZED)
          .json({ message: error.message }); // Return 401
      } else if (error instanceof ForbiddenException) {
        return response.status(HttpStatus.FORBIDDEN).json(error);
      }
      // Return a generic internal server error if an unexpected error occurs
      return response
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: 'Internal Server Error' });
    }
  }
}
