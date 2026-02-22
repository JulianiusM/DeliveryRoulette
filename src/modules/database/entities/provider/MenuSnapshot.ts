import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Restaurant} from "../restaurant/Restaurant";

@Entity("menu_snapshots")
export class MenuSnapshot {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Restaurant, {onDelete: "CASCADE"})
    @JoinColumn({name: "restaurant_id"})
    restaurant!: Restaurant;

    @Column("varchar", {name: "restaurant_id"})
    restaurantId!: string;

    @Column("varchar", {name: "provider_key", length: 100})
    providerKey!: string;

    @Column("text", {name: "source_url"})
    sourceUrl!: string;

    @Column("timestamp", {name: "fetched_at"})
    fetchedAt!: Date;

    @Column("longtext", {name: "raw_html", nullable: true})
    rawHtml?: string | null;

    @Column("longtext", {name: "raw_text"})
    rawText!: string;

    @Column("tinyint", {
        name: "parse_ok",
        width: 1,
        default: 0,
    })
    parseOk!: boolean;

    @Column("text", {name: "parse_warnings_json", nullable: true})
    parseWarningsJson?: string | null;
}
