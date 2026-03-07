import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique} from "typeorm";
import {UserLocation} from "../user/UserLocation";

@Entity("provider_location_refs")
@Unique("UQ_provider_location_refs_provider_source", ["providerKey", "sourceLocationId"])
export class ProviderLocationRef {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => UserLocation, {onDelete: "CASCADE"})
    @JoinColumn({name: "source_location_id"})
    sourceLocation!: UserLocation;

    @Column("varchar", {name: "source_location_id"})
    sourceLocationId!: string;

    @Column("varchar", {name: "provider_key", length: 100})
    providerKey!: string;

    @Column("varchar", {name: "provider_area_id", length: 255, nullable: true})
    providerAreaId?: string | null;

    @Column("varchar", {name: "provider_location_slug", length: 255, nullable: true})
    providerLocationSlug?: string | null;

    @Column("double", {name: "latitude", nullable: true})
    latitude?: number | null;

    @Column("double", {name: "longitude", nullable: true})
    longitude?: number | null;

    @Column("varchar", {name: "status", length: 50, default: "resolved"})
    status!: string;

    @Column("longtext", {name: "raw_resolution_json", nullable: true})
    rawResolutionJson?: string | null;

    @Column("timestamp", {name: "last_resolved_at", nullable: true})
    lastResolvedAt?: Date | null;

    @Column("timestamp", {name: "expires_at", nullable: true})
    expiresAt?: Date | null;

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
