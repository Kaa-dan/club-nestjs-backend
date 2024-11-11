import { Test, TestingModule } from '@nestjs/testing';
import { RulesRegulationsController } from './rules-regulations.controller';

describe('RulesRegulationsController', () => {
  let controller: RulesRegulationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RulesRegulationsController],
    }).compile();

    controller = module.get<RulesRegulationsController>(RulesRegulationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
