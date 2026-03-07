import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique} from "typeorm";
import {Restaurant} from "./Restaurant";
import {RestaurantProviderRef} from "./RestaurantProviderRef";
import {ProviderLocationRef} from "../provider/ProviderLocationRef";

@Entity("restaurant_provider_coverages")
@Unique("UQ_restaurant_provider_coverage_ref_location", ["restaurantProviderRefId", "providerLocationRefId"])
export class RestaurantProviderCoverage {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Restaurant, {onDelete: "CASCADE"})
    @JoinColumn({name: "restaurant_id"})
    restaurant!: Restaurant;

    @Column("varchar", {name: "restaurant_id"})
    restaurantId!: string;

    @ManyToOne(() => RestaurantProviderRef, {onDelete: "CASCADE"})
    @JoinColumn({name: "restaurant_provider_ref_id"})
    restaurantProviderRef!: RestaurantProviderRef;

    @Column("varchar", {name: "restaurant_provider_ref_id"})
    restaurantProviderRefId!: string;

    @ManyToOne(() => ProviderLocationRef, {onDelete: "CASCADE"})
    @JoinColumn({name: "provider_location_ref_id"})
    providerLocationRef!: ProviderLocationRef;

    @Column("varchar", {name: "provider_location_ref_id"})
    providerLocationRefId!: string;

    @Column("varchar", {name: "status", length: 50, default: "active"})
    status!: string;

    @Column("timestamp", {name: "first_seen_at", default: () => "CURRENT_TIMESTAMP"})
    firstSeenAt!: Date;

    @Column("timestamp", {name: "last_seen_at", default: () => "CURRENT_TIMESTAMP"})
    lastSeenAt!: Date;

    @Column("varchar", {name: "source_url", length: 500, nullable: true})
    sourceUrl?: string | null;

    @Column("longtext", {name: "raw_listing_json", nullable: true})
    rawListingJson?: string | null;

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
