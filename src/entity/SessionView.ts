import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { Session } from "./Session";

@Entity("session_views")
export class SessionView {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  sessionId: string;

  @Column({ type: "int", nullable: true })
  userId: number | null;

  @ManyToOne(() => Session, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sessionId" })
  session: Session;

  @ManyToOne(() => User, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User | null;

  @CreateDateColumn()
  joinedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  leftAt: Date | null;

  @Column({ type: "int", default: 0 })
  watchDuration: number; // in seconds

  @Column({ type: "varchar", length: 50, nullable: true })
  socketId: string | null;

  @Column({
    type: "enum",
    enum: ["subscriber", "publisher"],
    default: "subscriber",
  })
  role: string;
}
