import { Test, TestingModule } from '@nestjs/testing';
import { DebateService } from './debate.service';

describe('DebateService', () => {
  let service: DebateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DebateService],
    }).compile();

    service = module.get<DebateService>(DebateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
