import { Test, TestingModule } from '@nestjs/testing';
import { AdoptContributionController } from './adopt-contribution.controller';
import { AdoptContributionService } from './adopt-contribution.service';

describe('AdoptContributionController', () => {
  let controller: AdoptContributionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdoptContributionController],
      providers: [AdoptContributionService],
    }).compile();

    controller = module.get<AdoptContributionController>(AdoptContributionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
