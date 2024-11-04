import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SharedModule } from 'src/shared/shared.module';
import { UploadModule } from 'src/shared/upload/upload.module';


@Module({
  imports: [
    SharedModule,
    UploadModule
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService]
})
export class OnboardingModule {}
