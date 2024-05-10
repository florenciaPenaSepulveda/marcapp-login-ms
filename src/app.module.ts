import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { User } from './users/user.entity';
import { MailerModule } from '@nestjs-modules/mailer';
import { CorreosService } from './correos/correos.service';
import { CorreosModule } from './correos/correos.module';

import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: '1234',
      database: 'usersDB',
      entities: [User],
    }),
    UsersModule,
    MailerModule,
    CorreosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
