import {Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn} from "typeorm";
import {DietTag} from "./DietTag";

@Entity("diet_tag_dishes")
export class DietTagDish {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => DietTag, (tag) => tag.dishes, {onDelete: "CASCADE"})
    @JoinColumn({name: "diet_tag_id"})
    dietTag!: DietTag;

    @Column({name: "diet_tag_id"})
    dietTagId!: string;

    @Column("varchar", {name: "value", length: 150})
    value!: string;
}
