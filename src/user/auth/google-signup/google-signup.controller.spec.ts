import { Test, TestingModule } from '@nestjs/testing';
import { GoogleSignupController } from './google-signup.controller';

describe('GoogleSignupController', () => {
  let controller: GoogleSignupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleSignupController],
    }).compile();

    controller = module.get<GoogleSignupController>(GoogleSignupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
