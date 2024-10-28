import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SharedModule } from 'src/shared/shared.module';


@Module({
  imports: [
    SharedModule
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService]
})
export class OnboardingModule {}
