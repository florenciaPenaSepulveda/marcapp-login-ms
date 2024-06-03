import { Role } from 'src/enum/user-type.enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  pass: string;

  @Column()
  birthday: Date;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER
  })
  type: Role;
}
