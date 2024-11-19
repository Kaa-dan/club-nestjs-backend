import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  registerDecorator,
  ValidateIf,
  ValidateNested,
  ValidationOptions,
} from 'class-validator';
import { Types } from 'mongoose';

export class FileDto {
  @IsNotEmpty()
  buffer: Buffer;

  @IsString()
  @IsNotEmpty()
  originalname: string;

  @IsString()
  @IsNotEmpty()
  mimetype: string;

  @IsNumber()
  @Min(0)
  size: number;
}

const toObjectId = (value: string | null | undefined) => {
  if (!value) return undefined;
  try {
    return new Types.ObjectId(value);
  } catch (error) {
    return value; // Return original value to let IsMongoId validation catch it
  }
};
export class CreateIssuesDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  issueType: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  whereOrWho: string;

  @IsOptional()
  deadline: string;

  @IsOptional()
  @IsString()
  reasonOfDeadline: string;

  @IsNotEmpty()
  @IsString()
  significance: string;

  @IsOptional()
  //   @IsMongoId({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((id) => toObjectId(id)) : [],
  )
  whoShouldAddress: Types.ObjectId[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FileDto)
  files: FileDto[];

  @IsBoolean()
  isPublic: boolean;

  @IsBoolean()
  isAnonymous: boolean;

  @IsOptional()
  @ValidateIf((o) => !o.club)
  @Transform(({ value }) => toObjectId(value))
  @RequireOneOf(['node', 'club'])
  node?: Types.ObjectId;

  @IsOptional()
  @ValidateIf((o) => !o.node)
  @Transform(({ value }) => toObjectId(value))
  @RequireOneOf(['node', 'club'])
  club?: Types.ObjectId;
}

function RequireOneOf(
  properties: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'requireOneOf',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: any) {
          const object = args.object;
          const providedCount = properties.filter(
            (prop) => object[prop] !== undefined && object[prop] !== null,
          ).length;
          return providedCount === 1;
        },
        defaultMessage(): string {
          return `Exactly one of ${properties.join(', ')} must be provided`;
        },
      },
    });
  };
}
