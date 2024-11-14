import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { ENV } from 'src/utils/config/env.config';

interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

@Injectable()
export class RecaptchaService {
  async validateRecaptcha(token: string): Promise<boolean> {
    try {
      const response = await axios.post<RecaptchaResponse>(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: ENV.RECAPTCHA_SECRET_KEY,
            response: token,
          },
        },
      );

      if (response.data.success) {
        return true;
      }

      console.error(
        'reCAPTCHA validation failed',
        response.data['error-codes'],
      );
      return false;
    } catch (error) {
      console.error('Error validating reCAPTCHA:', error.message);
      throw new InternalServerErrorException('Could not validate reCAPTCHA');
    }
  }
}
