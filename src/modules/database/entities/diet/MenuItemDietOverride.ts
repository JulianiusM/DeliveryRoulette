import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique} from "typeorm";
import {MenuItem} from "../menu/MenuItem";
import {DietTag} from "./DietTag";

@Entity("menu_item_diet_overrides")
@Unique("UQ_menu_item_diet_override_item_tag", ["menuItemId", "dietTagId"])
export class MenuItemDietOverride {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => MenuItem, {onDelete: "CASCADE"})
    @JoinColumn({name: "menu_item_id"})
    menuItem!: MenuItem;

    @Column({name: "menu_item_id"})
    menuItemId!: string;

    @ManyToOne(() => DietTag, {onDelete: "CASCADE"})
    @JoinColumn({name: "diet_tag_id"})
    dietTag!: DietTag;

    @Column({name: "diet_tag_id"})
    dietTagId!: string;

    @Column("tinyint", {name: "supported", width: 1})
    supported!: boolean;

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
