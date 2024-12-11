import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as path from 'path';
import { ENV } from 'src/utils/config/env.config';

@Injectable()
export class UploadService {
  private readonly s3Client: S3Client;
  private readonly bucketEndpoint: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: ENV.AWS_ACCESS_KEY_ID,
        secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
      },
      region: ENV.AWS_REGION,
    });
    this.bucketEndpoint = `${ENV.S3_BUCKET_NAME}.s3.amazonaws.com`;
  }

  private extractKeyFromUrl(url: string): string | null {
    const bucketName = ENV.S3_BUCKET_NAME;
    const regex = new RegExp(
      `https://(${bucketName}.s3.amazonaws.com|s3.amazonaws.com/${bucketName})/(.*)`,
    );
    const match = url.match(regex);
    return match ? match[2] : null;
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    mimetype: string,
    folder: 'node' | 'user' | 'club' | 'comment',
  ): Promise<{
    filename: string;
    url: string;
  }> {
    try {
      const fileExtension = path.extname(filename);
      const uniqueFileName = `${Date.now()}-${Math.round(
        Math.random() * 1e9,
      )}${fileExtension}`;
      const key = `${folder}/${uniqueFileName}`;

      const command = new PutObjectCommand({
        Bucket: ENV.S3_BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: mimetype,
      });

      await this.s3Client.send(command);

      // const publicUrl = `https://s3.amazonaws.com/${ENV.S3_BUCKET_NAME}/${key}`;
      const publicUrl = `https://${this.bucketEndpoint}/${key}`;
      return {
        filename: key,
        url: publicUrl,
      };
    } catch (error) {
      (error);
      throw new InternalServerErrorException(
        `Failed to upload file: ${error.message ?? error}`,
      );
    }
  }

  async deleteFile(url: string): Promise<{ success: boolean }> {
    try {
      const fileKey = this.extractKeyFromUrl(url);
      if (!fileKey) throw new Error('Invalid S3 URL');

      const command = new DeleteObjectCommand({
        Bucket: ENV.S3_BUCKET_NAME,
        Key: fileKey,
      });

      await this.s3Client.send(command);

      return {
        success: true,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete file: ${error.message}`,
      );
    }
  }
}
