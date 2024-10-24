import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/shared/entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { generateToken } from 'src/utils';
import { ServiceResponse } from 'src/shared/types/service.response.type';

@Injectable()
export class ForgotPasswordService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async changePassword(emailDto: ChangePasswordDto): Promise<ServiceResponse> {
    try {
      const { email } = emailDto;

      // Validate email
      if (!email) {
        throw new BadRequestException('Email is required');
      }

      const user = await this.userModel.findOne({ email });
      // Check if user exists and is verified
      if (!user || !user.emailVerified || !user.registered) {
        throw new NotFoundException('User not found or email not verified');
      }

      // Generate token and URL
      const token = generateToken({ email }, '10min');
      const changePasswordUrl = `http://localhost:3000/forgot-password/change-password?token=${token}`;
      console.log(changePasswordUrl);
      return {
        success: true,
        message: 'Change password link generated successfully',
        status: 200,
        data: changePasswordUrl,
      };
    } catch (error) {
      throw error;
    }
  }
}
