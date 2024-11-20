import { Module } from '@nestjs/common';
import { RecaptchaService } from './recaptcha.service';
import { RecaptchaController } from './recaptcha.controller';

@Module({
  providers: [RecaptchaService],
  controllers: [RecaptchaController]
})
export class RecaptchaModule {}
