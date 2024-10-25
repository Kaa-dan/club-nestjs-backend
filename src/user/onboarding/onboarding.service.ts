import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDetailsDto } from './dto/create-details.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ServiceResponse } from 'src/shared/types/service.response.type';
import { User } from '../auth/signup/entities/user.entity';

@Injectable()
export class OnboardingService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) { }

    async createDetails(id: string, createDetailsDto: CreateDetailsDto): ServiceResponse {
        try {
            const updatedUser = await this.userModel.findByIdAndUpdate(
                id,
                {
                    $set: createDetailsDto
                },
                { new: true, runValidators: true }
            ).select('-password');
    
            if (!updatedUser) {
                throw new NotFoundException('User not found');
            }
    
            return {
                success: true,
                data: updatedUser,
                status: 200,
                message: "user details updated"
            };
        } catch (error) {
            return {
                success: false,
                status: error.getStatus(),
                message: error.getResponse(),
            }
        }

    }
}
