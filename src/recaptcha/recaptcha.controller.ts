import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { RecaptchaService } from './recaptcha.service';

@Controller('recaptcha')
export class RecaptchaController {
  constructor(private readonly recaptchaService: RecaptchaService) {}

  @Post()
  async validateRecaptcha(
    @Body('token') token: string,
  ): Promise<{ success: boolean }> {
    if (!token) {
      throw new BadRequestException('reCAPTCHA token is required');
    }

    try {
      const isValid = await this.recaptchaService.validateRecaptcha(token);

      if (!isValid) {
        throw new BadRequestException('reCAPTCHA validation failed');
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  }
}
