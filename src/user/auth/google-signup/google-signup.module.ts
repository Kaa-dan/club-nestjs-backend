import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserSchema, User } from 'src/shared/entities/user.entity';
import { GoogleSignupController } from './google-signup.controller';
import { GoogleSignupService } from './google-signup.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [GoogleSignupController],
  providers: [GoogleSignupService],
})
export class GoogleAuthModule {}
