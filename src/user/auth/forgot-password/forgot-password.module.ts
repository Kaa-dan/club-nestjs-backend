import { Module } from '@nestjs/common';
import { ForgotPasswordController } from './forgot-password.controller';
import { ForgotPasswordService } from './forgot-password.service';
import { SharedModule } from 'src/shared/shared.module';
@Module({
 imports:[SharedModule],
  controllers: [ForgotPasswordController],
  providers: [ForgotPasswordService],
})
export class ForgotPasswordModule {}
