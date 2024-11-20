import { Module } from '@nestjs/common';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';
import { SharedModule } from 'src/shared/shared.module';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [SharedModule],
  providers: [IssuesService

  ],
  controllers: [IssuesController],
})
export class IssuesModule { }
