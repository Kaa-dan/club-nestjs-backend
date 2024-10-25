import { Test, TestingModule } from '@nestjs/testing';
import { GoogleSignupService } from './google-signup.service';

describe('GoogleSignupService', () => {
  let service: GoogleSignupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleSignupService],
    }).compile();

    service = module.get<GoogleSignupService>(GoogleSignupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
