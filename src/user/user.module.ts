import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { NodeModule } from './node/node.module';


@Module({
  imports: [
    AuthModule,
    OnboardingModule,
    NodeModule,

    
  ],
})
export class UserModule {}
