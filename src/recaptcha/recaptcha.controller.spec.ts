import { Test, TestingModule } from '@nestjs/testing';
import { RecaptchaController } from './recaptcha.controller';

describe('RecaptchaController', () => {
  let controller: RecaptchaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecaptchaController],
    }).compile();

    controller = module.get<RecaptchaController>(RecaptchaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
