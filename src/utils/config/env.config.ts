import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
export default () => ({
  DATABASE_URL: process.env.DATABASE,
});

export const ENV = {
  DATABASE_URL: process.env.DATABASE,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT,
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  DEFAULT_FROM_EMAIL: process.env.DEFAULT_FROM_EMAIL,
  DEFAULT_FROM_NAME: process.env.DEFAULT_FROM_NAME,
};
