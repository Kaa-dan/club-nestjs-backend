import { Controller, Get, Query } from '@nestjs/common';

import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get('feed')
  async getFeed(@Query('entity') entity : 'club' | 'node', @Query('entityId') entityId : string) {
    return this.assetsService.getAssetsByEntity(entity, entityId);
  }
}
