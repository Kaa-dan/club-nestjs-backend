import { Test, TestingModule } from '@nestjs/testing';
import { GoogleSigninController } from './google-signin.controller';

describe('GoogleSigninController', () => {
  let controller: GoogleSigninController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleSigninController],
    }).compile();

    controller = module.get<GoogleSigninController>(GoogleSigninController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
