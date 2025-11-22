import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from "typeorm";
import { User } from "./User";
import { Product } from "./Product";

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  category: string;

  @Column({ type: "simple-array", nullable: true })
  tags: string[];

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

  @Column({ type: "varchar", length: 255, nullable: true })
  agoraChannelName: string;

  @Column({ type: "timestamp", nullable: true })
  startedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  endedAt: Date;

  @Column({ type: "int" })
  creatorId: number;

  @ManyToOne(() => User, { eager: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "creatorId" })
  creator: User;

  @Column({ type: "uuid", nullable: true })
  activeProductId: string;

  @ManyToOne(() => Product, { eager: false })
  @JoinColumn({ name: "activeProductId" })
  activeProduct: Product;

  @Column({ type: "jsonb", nullable: true, default: {} })
  reactionCounts: { [key: string]: number };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
