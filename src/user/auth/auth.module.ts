import { Module } from '@nestjs/common';
import { SignupModule } from './signup/signup.module';

@Module({
  imports: [SignupModule],
  
})
export class AuthModule {}
