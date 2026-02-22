import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity("provider_source_configs")
export class ProviderSourceConfig {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("varchar", {name: "user_id", length: 36})
    userId!: string;

    @Column("varchar", {name: "provider_key", length: 100})
    providerKey!: string;

    @Column("text", {name: "listing_url"})
    listingUrl!: string;

    @Column("tinyint", {
        name: "is_enabled",
        width: 1,
        default: 1,
    })
    isEnabled!: boolean;

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
