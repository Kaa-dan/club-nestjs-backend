import { Module } from '@nestjs/common';
import { SignupModule } from './signup/signup.module';
import { LoginModule } from './login/login.module';

@Module({
  imports: [SignupModule, LoginModule],
  
})
export class AuthModule {}
