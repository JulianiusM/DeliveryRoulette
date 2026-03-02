import {Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn} from "typeorm";
import {DietTag} from "./DietTag";

@Entity("diet_tag_keywords")
export class DietTagKeyword {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => DietTag, (tag) => tag.keywords, {onDelete: "CASCADE"})
    @JoinColumn({name: "diet_tag_id"})
    dietTag!: DietTag;

    @Column({name: "diet_tag_id"})
    dietTagId!: string;

    @Column("varchar", {name: "value", length: 150})
    value!: string;
}
