import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';


@Module({
  imports: [
    AuthModule,
    OnboardingModule,

    
  ],
})
export class UserModule {}
