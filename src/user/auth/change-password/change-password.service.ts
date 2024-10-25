import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { User } from 'src/shared/entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ServiceResponse } from 'src/shared/types/service.response.type';
import { hashPassword, verifyToken } from 'src/utils'; // Assuming you have a utility function to verify tokens

@Injectable()
export class ChangePasswordService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async changePassword(
    password: string,
    authorization: string,
  ): Promise<ServiceResponse> {
    const token = authorization.replace('Bearer ', '');

    try {
      if (!token) {
        throw new BadRequestException('Token is required');
      }
console.log(token,"tooo");

      // Step 2: Verify the token
      const decoded = verifyToken(token) as { email: string };
      console.log(decoded,"deccc");
      
      if (!decoded) {
        throw new BadRequestException('Invalid or expired token');
      }

      const user = await this.userModel.findOne({ email: decoded.email });
      if (!user) {
        throw new NotFoundException('User not found');
      }
const hashedPassword = await hashPassword(password)
      user.password = hashedPassword;
      await user.save();

      return {
        success: true,
        message: 'Password changed successfully',
        status: 200,
      };
    } catch (error) {
      throw error;
    }
  }
}
