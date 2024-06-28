import { Role } from 'src/enum/user-type.enum';
import * as typeOrm from 'typeorm';

@typeOrm.Entity({ name: 'users' })
export class User {
  @typeOrm.PrimaryGeneratedColumn()
  id: number;

  @typeOrm.Column()
  email: string;

  @typeOrm.Column()
  firstName: string;

  @typeOrm.Column()
  lastName: string;

  @typeOrm.Column()
  pass: string;

  @typeOrm.Column()
  birthday: Date;

  @typeOrm.Column({
    type: 'enum',
    enum: Role,
    default: Role.USER
  })
  type: Role;
}
