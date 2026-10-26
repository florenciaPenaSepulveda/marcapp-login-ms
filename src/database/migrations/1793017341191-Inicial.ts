import { MigrationInterface, QueryRunner } from 'typeorm';

export class Inicial1793017341191 implements MigrationInterface {
  name = 'Inicial1793017341191';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(254) NOT NULL, \`firstName\` varchar(40) NOT NULL, \`lastName\` varchar(40) NOT NULL, \`pass\` varchar(60) NOT NULL, \`birthday\` date NOT NULL, \`type\` enum ('admin', 'user') NOT NULL DEFAULT 'user', \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``,
    );
    await queryRunner.query(`DROP TABLE \`users\``);
  }
}
