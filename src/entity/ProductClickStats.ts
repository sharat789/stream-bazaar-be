import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Session } from "./Session";
import { Product } from "./Product";

@Entity("product_click_stats")
export class ProductClickStats {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  sessionId: string;

  @Column({ type: "uuid" })
  productId: string;

  @ManyToOne(() => Session, { onDelete: "CASCADE" })
  @JoinColumn({ name: "sessionId" })
  session: Session;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: "productId" })
  product: Product;

  @Column({ type: "int", default: 0 })
  uniqueClicks: number; // Number of unique users who clicked

  @Column({ type: "int", default: 0 })
  totalClicks: number; // Total number of clicks (including repeats)

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  clickThroughRate: number; // Percentage of viewers who clicked

  @Column({ type: "int", default: 0 })
  totalViewers: number; // Total viewers during session (for CTR calculation)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
