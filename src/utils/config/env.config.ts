import * as dotenv from 'dotenv';
import  * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
export default () => ({
  DATABASE_URL: process.env.DATABASE,
});
