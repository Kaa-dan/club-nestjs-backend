// src/signup/signup.controller.ts
import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './entities/user.entity';
@Controller('register')
export class SignupController {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>, // Injecting the User model
  ) {}

  @Get()
  async fetchUsers() {
    // Fetch all users from the database
    const users = await this.userModel.find().exec();
    console.log(users,"users");
    

    // Return the list of users
    return {
      message: 'Fetched users successfully',
      users,
    };
  }
}
