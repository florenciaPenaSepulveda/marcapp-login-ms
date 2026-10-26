import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';

export const opcionesBase = (produccion: boolean) => ({
  type: 'mysql' as const,
  entities: [User],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
  synchronize: !produccion,
  migrationsRun: produccion,
});

export default new DataSource({
  ...opcionesBase(false),
  synchronize: false,
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'usersDB',
});
