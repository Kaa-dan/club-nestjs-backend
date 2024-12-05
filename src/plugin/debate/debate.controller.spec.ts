import { Test, TestingModule } from '@nestjs/testing';
import { DebateController } from './debate.controller';

describe('DebateController', () => {
  let controller: DebateController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DebateController],
    }).compile();

    controller = module.get<DebateController>(DebateController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
