import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({
    type: "enum",
    enum: ["scheduled", "live", "paused", "ended"],
    default: "scheduled",
  })
  status: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  streamUrl: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  streamKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
