import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';

import { AssetsService } from './assets.service';
import { Request } from 'express';
import { BookmarksService } from 'src/user/bookmarks/bookmarks.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService, private readonly bookmarkService: BookmarksService) { }
  @Get('feed')
  async getFeed(
    @Query('entity') entity: 'club' | 'node',
    @Query('entityId') entityId: string,
    @Req() req: Request
  ) {
    const user = req.user;

    // Get assets for the entity
    const assets = await this.assetsService.getAssetsByEntity(entity, entityId);

    // If no items, return the original pagination structure with empty items
    if (!assets.items.length) {
      return assets;
    }

    // Prepare entities array for bookmark check
    const entitiesToCheck = assets.items.map(asset => ({
      id: asset._id.toString(),
      type: asset.type,
    }));

    // Get bookmark status for all assets
    const bookmarkStatus = await this.bookmarkService.checkBookmarkStatus(
      user._id.toString(),
      entitiesToCheck,
    );

    // Update items with bookmark status while keeping the pagination structure
    return {
      ...assets,
      items: assets.items.map(asset => {
        const bookmarkInfo = bookmarkStatus.find(
          status =>
            status.entityId === asset._id.toString() &&
            status.entityType === asset.type
        );

        return {
          ...asset,
          isBookmarked: bookmarkInfo?.isBookmarked || false,
        };
      })
    };
  }


  @Post('relevancy')
  async toggleRelevancy(
    @Body() body: {
      type: 'projects' | 'issues',
      moduleId: string,
      action: 'like' | 'dislike'
    },
    @Req() request: Request
  ) {
    return this.assetsService.feedRelevancyAction(
      body.type,
      body.moduleId,
      body.action,
      request.user._id
    );
  }

}
