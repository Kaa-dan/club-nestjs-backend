import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../auth/signup/entities/user.entity';
import { UploadModule } from 'src/shared/upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UploadModule
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService]
})
export class OnboardingModule {}
