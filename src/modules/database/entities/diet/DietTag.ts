import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity("diet_tags")
export class DietTag {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("varchar", {name: "key", length: 50, unique: true})
    key!: string;

    @Column("varchar", {name: "label", length: 100})
    label!: string;

    @Column("text", {name: "keyword_whitelist_json", nullable: true})
    keywordWhitelistJson?: string | null;

    @Column("text", {name: "dish_whitelist_json", nullable: true})
    dishWhitelistJson?: string | null;

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
