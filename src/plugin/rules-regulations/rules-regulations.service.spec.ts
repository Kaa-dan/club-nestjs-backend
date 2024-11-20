import { Test, TestingModule } from '@nestjs/testing';
import { RulesRegulationsService } from './rules-regulations.service';

describe('RulesRegulationsService', () => {
  let service: RulesRegulationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RulesRegulationsService],
    }).compile();

    service = module.get<RulesRegulationsService>(RulesRegulationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
