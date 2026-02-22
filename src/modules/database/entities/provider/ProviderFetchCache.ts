import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity("provider_fetch_cache")
export class ProviderFetchCache {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("varchar", {name: "provider_key", length: 100})
    providerKey!: string;

    @Column("varchar", {name: "cache_key", length: 64})
    cacheKey!: string;

    @Column("text", {name: "url"})
    url!: string;

    @Column("int", {name: "status_code"})
    statusCode!: number;

    @Column("timestamp", {name: "fetched_at"})
    fetchedAt!: Date;

    @Column("timestamp", {name: "expires_at"})
    expiresAt!: Date;

    @Column("longtext", {name: "body", nullable: true})
    body?: string | null;
}
