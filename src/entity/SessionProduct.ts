import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Session } from "./Session";
import { Product } from "./Product";

@Entity("session_products")
export class SessionProduct {
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

  @Column({ type: "boolean", default: false })
  featured: boolean;

  @Column({ type: "int", default: 0 })
  displayOrder: number;

  @CreateDateColumn()
  createdAt: Date;
}
