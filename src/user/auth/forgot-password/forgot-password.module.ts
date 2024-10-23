import { Module } from '@nestjs/common';
import { ForgotPasswordController } from './forgot-password.controller';
import { ForgotPasswordService } from './forgot-password.service';

@Module({
  controllers: [ForgotPasswordController],
  providers: [ForgotPasswordService]
})
export class ForgotPasswordModule {}
