import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {
    // Initialize Cloudinary with your credentials
    cloudinary.config({
      cloud_name: this.configService.getOrThrow('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.getOrThrow('CLOUDINARY_API_KEY'),
      api_secret: this.configService.getOrThrow('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(file: Buffer, folder: string) {
    try {
      // Convert the buffer to base64
      const b64 = Buffer.from(file).toString('base64');

      // Upload to cloudinary
      const result = await cloudinary.uploader.upload(b64, {
        resource_type: 'auto',
        folder: folder,
      });

      return {
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  // Optional: Method to delete a file from Cloudinary
  async deleteFile(publicId: string) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return {
        success: true,
        result,
      };
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}
