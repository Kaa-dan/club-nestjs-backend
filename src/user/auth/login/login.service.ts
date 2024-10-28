import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoginDto } from './dto/login.sto';
import { User } from 'src/shared/entities/user.entity';
import { comparePasswords } from 'src/utils';
import { generateToken } from 'src/utils';
@Injectable()
export class LoginService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
 
  ) {}

  async login(
    loginDto: LoginDto,
  ): Promise<{ status: boolean; message: string; token?: string }> {
    const { email, password } = loginDto;

    // Check if the user exists
    const user = await this.userModel.findOne({ email });

    if (!user) {
      // If the user is not found, throw a 400 Bad Request with a specific message
      throw new BadRequestException('No user found with this email address');
    }

    // Verify the password
    const isPasswordValid = await comparePasswords(password, user.password);
    if (!isPasswordValid) {
      // If the password is incorrect, throw a 401 Unauthorized
      throw new UnauthorizedException('Invalid password provided');
    }

    // Check if the user is blocked
    if (user.isBlocked) {
      // If the user's account is blocked, throw a 403 Forbidden
      throw new UnauthorizedException('Your account is currently blocked');
    }

    // Generate JWT token
    const token = generateToken({ email: user.email,id:user._id }, '3hrs');

    // Return a successful response with the token
    return {
      status: true,
      message: 'Login successful',
      token,
    };
  }
}
