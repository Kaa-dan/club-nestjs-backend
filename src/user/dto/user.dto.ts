import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsEmail,
  IsBoolean,
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Exclude, Transform } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  @IsMongoId()
  @Transform(({ value }) => value.toString(), { toPlainOnly: true })
  _id: string;

  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User interests', type: [String], default: [] })
  @IsArray()
  @IsOptional()
  interests: string[] = [];

  @ApiProperty({ description: 'Whether user is blocked', default: false })
  @IsBoolean()
  @IsOptional()
  isBlocked: boolean = false;

  @ApiProperty({ description: 'Email verification status', default: false })
  @IsBoolean()
  @IsOptional()
  emailVerified: boolean = false;

  @ApiProperty({ description: 'Registration status', default: false })
  @IsBoolean()
  @IsOptional()
  registered: boolean = false;

  @ApiProperty({
    description: 'Signup method',
    enum: ['gmail', 'email', 'facebook', 'apple'],
    example: 'gmail',
  })
  @IsString()
  signupThrough: string;

  @ApiProperty({ description: 'Onboarding completion status', default: false })
  @IsBoolean()
  @IsOptional()
  isOnBoarded: boolean = false;

  @ApiProperty({
    description: 'Current onboarding stage',
    enum: ['basic', 'image', 'interests', 'completed'],
    example: 'image',
  })
  @IsString()
  onBoardingStage: string;

  @ApiProperty({ description: "User's first name" })
  @IsString()
  firstName: string;

  @ApiProperty({ description: "User's last name" })
  @IsString()
  lastName: string;

  @ApiProperty({
    description: "User's gender",
    enum: ['male', 'female', 'other'],
    example: 'female',
  })
  @IsString()
  gender: string;

  @ApiProperty({
    description: "User's phone number",
    example: '6576745677',
  })
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    description: "URL of user's cover image",
    required: false,
  })
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiProperty({
    description: "URL of user's profile image",
    required: false,
  })
  @IsString()
  @IsOptional()
  profileImage?: string;

  @ApiProperty({ description: 'MongoDB version key' })
  @IsNumber()
  @IsOptional()
  __v: number = 0;
}
