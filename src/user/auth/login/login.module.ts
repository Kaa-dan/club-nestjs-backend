import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // Import MongooseModule
import { LoginController } from './login.controller';
import { LoginService } from './login.service';
import { UserSchema, User } from 'src/shared/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), // Import the User schema
  ],
  controllers: [LoginController],
  providers: [LoginService],
})
export class LoginModule {}
