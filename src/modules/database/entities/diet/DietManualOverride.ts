import {Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Unique} from "typeorm";
import {Restaurant} from "../restaurant/Restaurant";
import {DietTag} from "./DietTag";

@Entity("diet_manual_overrides")
@Unique("UQ_diet_override_restaurant_tag", ["restaurantId", "dietTagId"])
export class DietManualOverride {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Restaurant, {onDelete: "CASCADE"})
    @JoinColumn({name: "restaurant_id"})
    restaurant!: Restaurant;

    @Column({name: "restaurant_id"})
    restaurantId!: string;

    @ManyToOne(() => DietTag, {onDelete: "CASCADE"})
    @JoinColumn({name: "diet_tag_id"})
    dietTag!: DietTag;

    @Column({name: "diet_tag_id"})
    dietTagId!: string;

    @Column("tinyint", {name: "supported", width: 1})
    supported!: boolean;

    @Column("int", {name: "user_id"})
    userId!: number;

    @Column("text", {name: "notes", nullable: true})
    notes?: string | null;

    @Column("timestamp", {
        name: "created_at",
        default: () => "CURRENT_TIMESTAMP",
    })
    createdAt!: Date;

    @Column("timestamp", {
        name: "updated_at",
        default: () => "CURRENT_TIMESTAMP",
    })
    updatedAt!: Date;
}
