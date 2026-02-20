import {Column, Entity, ManyToOne, JoinColumn, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {Restaurant} from "../restaurant/Restaurant";
import {MenuItem} from "./MenuItem";

@Entity("menu_categories")
export class MenuCategory {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("varchar", {name: "name", length: 150})
    name!: string;

    @Column("int", {name: "sort_order", default: 0})
    sortOrder!: number;

    @Column("tinyint", {name: "is_active", width: 1, default: 1})
    isActive!: boolean;

    @Column("varchar", {name: "restaurant_id", length: 36})
    restaurantId!: string;

    @ManyToOne(() => Restaurant, {onDelete: "CASCADE"})
    @JoinColumn({name: "restaurant_id"})
    restaurant!: Restaurant;

    @OneToMany(() => MenuItem, (item) => item.category, {eager: false})
    items!: MenuItem[];

    @Column("timestamp", {name: "created_at", default: () => "CURRENT_TIMESTAMP"})
    createdAt!: Date;

    @Column("timestamp", {name: "updated_at", default: () => "CURRENT_TIMESTAMP"})
    updatedAt!: Date;
}
