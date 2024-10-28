import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { MongooseModule } from '@nestjs/mongoose';
<<<<<<< HEAD
import { SharedModule } from 'src/shared/shared.module';


@Module({
  imports: [
    SharedModule
=======
import { User, UserSchema } from '../auth/signup/entities/user.entity';
import { UploadModule } from 'src/shared/upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    UploadModule
>>>>>>> 1adc70332a508023b06fcdb495acc1248d7abf2e
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService]
})
export class OnboardingModule {}
