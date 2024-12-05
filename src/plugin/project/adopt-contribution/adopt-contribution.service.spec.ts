import { Test, TestingModule } from '@nestjs/testing';
import { AdoptContributionService } from './adopt-contribution.service';

describe('AdoptContributionService', () => {
  let service: AdoptContributionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdoptContributionService],
    }).compile();

    service = module.get<AdoptContributionService>(AdoptContributionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
