import {
    IsEmail,
    IsOptional,
    IsString,
    IsUrl,
    IsPhoneNumber,
  } from 'class-validator';
  
  export class GoogleSignIn {
    @IsEmail()
    email: string;
  
    @IsString()
    userName: string;
  
    @IsUrl()
    imageUrl: string;
  
    @IsOptional()
    @IsPhoneNumber('IN')
    phoneNumber?: string;
  
    @IsString()
    signupThrough: string;
  }
  