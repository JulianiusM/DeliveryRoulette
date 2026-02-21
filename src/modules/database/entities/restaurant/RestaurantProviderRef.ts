import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Restaurant} from "./Restaurant";

@Entity("restaurant_provider_refs")
export class RestaurantProviderRef {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Restaurant, {onDelete: "CASCADE"})
    @JoinColumn({name: "restaurant_id"})
    restaurant!: Restaurant;

    @Column("varchar", {name: "restaurant_id"})
    restaurantId!: string;

    @Column("varchar", {name: "provider_key", length: 100})
    providerKey!: string;

    @Column("varchar", {name: "external_id", length: 255, nullable: true})
    externalId?: string | null;

    @Column("varchar", {name: "url", length: 500})
    url!: string;

    @Column("timestamp", {name: "last_sync_at", nullable: true})
    lastSyncAt?: Date | null;

    @Column("varchar", {name: "status", length: 50, default: "'active'"})
    status!: string;

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
