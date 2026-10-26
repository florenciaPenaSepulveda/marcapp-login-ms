import { MigrationInterface, QueryRunner } from 'typeorm';

export class VersionDeSesion1793027334405 implements MigrationInterface {
  name = 'VersionDeSesion1793027334405';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`tokenVersion\` int NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` DROP COLUMN \`tokenVersion\``,
    );
  }
}
