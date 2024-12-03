import { IsNumber, IsString } from 'class-validator';

export class BannerImage {
  @IsString()
  filename: string;

  @IsString()
  url: string;
}

export class TeamMember {
  @IsString()
  name: string;

  @IsString()
  designation: string;
}

export class TrackingMetric {
  @IsString()
  title: string;

  @IsString()
  value: string;

  @IsNumber()
  unit: number;
}
