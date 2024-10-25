import { Test, TestingModule } from '@nestjs/testing';
import { GoogleSigninService } from './google-signin.service';

describe('GoogleSigninService', () => {
  let service: GoogleSigninService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleSigninService],
    }).compile();

    service = module.get<GoogleSigninService>(GoogleSigninService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
