import {Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn} from "typeorm";
import {MenuCategory} from "./MenuCategory";

@Entity("menu_items")
export class MenuItem {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("varchar", {name: "name", length: 150})
    name!: string;

    @Column("varchar", {name: "description", length: 500, nullable: true})
    description?: string | null;

    @Column("text", {name: "diet_context", nullable: true})
    dietContext?: string | null;

    @Column("text", {name: "allergens", nullable: true})
    allergens?: string | null;

    @Column("decimal", {name: "price", precision: 10, scale: 2, nullable: true})
    price?: number | null;

    @Column("varchar", {name: "currency", length: 3, nullable: true})
    currency?: string | null;

    @Column("int", {name: "sort_order", default: 0})
    sortOrder!: number;

    @Column("tinyint", {name: "is_active", width: 1, default: 1})
    isActive!: boolean;

    @ManyToOne(() => MenuCategory, (cat) => cat.items, {onDelete: "CASCADE"})
    @JoinColumn({name: "category_id"})
    category!: MenuCategory;

    @Column({name: "category_id"})
    categoryId!: string;

    @Column("timestamp", {name: "created_at", default: () => "CURRENT_TIMESTAMP"})
    createdAt!: Date;

    @Column("timestamp", {name: "updated_at", default: () => "CURRENT_TIMESTAMP"})
    updatedAt!: Date;
}
