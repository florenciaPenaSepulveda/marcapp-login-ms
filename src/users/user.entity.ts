import { Role } from 'src/enum/user-type.enum';
import * as typeOrm from 'typeorm';

@typeOrm.Entity({ name: 'users' })
export class User {
  @typeOrm.PrimaryGeneratedColumn()
  id: number;

  @typeOrm.Index({ unique: true })
  @typeOrm.Column({ length: 254 })
  email: string;

  @typeOrm.Column({ length: 40 })
  firstName: string;

  @typeOrm.Column({ length: 40 })
  lastName: string;

  @typeOrm.Column({ length: 60, select: false })
  pass: string;

  @typeOrm.Column({ type: 'date' })
  birthday: string;

  @typeOrm.Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  type: Role;

  @typeOrm.Column({ type: 'int', default: 0, select: false })
  tokenVersion: number;

  @typeOrm.CreateDateColumn()
  createdAt: Date;
}
