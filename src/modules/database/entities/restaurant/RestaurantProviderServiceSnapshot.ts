import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {RestaurantProviderCoverage} from "./RestaurantProviderCoverage";

@Entity("restaurant_provider_service_snapshots")
export class RestaurantProviderServiceSnapshot {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => RestaurantProviderCoverage, {onDelete: "CASCADE"})
    @JoinColumn({name: "coverage_id"})
    coverage!: RestaurantProviderCoverage;

    @Column("varchar", {name: "coverage_id"})
    coverageId!: string;

    @Column("varchar", {name: "service_type", length: 50})
    serviceType!: string;

    @Column("tinyint", {
        name: "is_available",
        width: 1,
        default: 0,
    })
    isAvailable!: boolean;

    @Column("tinyint", {
        name: "is_temporary_offline",
        width: 1,
        default: 0,
    })
    isTemporaryOffline!: boolean;

    @Column("tinyint", {
        name: "is_throttled",
        width: 1,
        default: 0,
    })
    isThrottled!: boolean;

    @Column("int", {name: "eta_min", nullable: true})
    etaMin?: number | null;

    @Column("int", {name: "eta_max", nullable: true})
    etaMax?: number | null;

    @Column("int", {name: "min_order_amount_minor", nullable: true})
    minOrderAmountMinor?: number | null;

    @Column("varchar", {name: "currency", length: 10, nullable: true})
    currency?: string | null;

    @Column("longtext", {name: "fee_bands_json", nullable: true})
    feeBandsJson?: string | null;

    @Column("int", {name: "bag_fee_minor", nullable: true})
    bagFeeMinor?: number | null;

    @Column("int", {name: "service_fee_minor", nullable: true})
    serviceFeeMinor?: number | null;

    @Column("int", {name: "small_order_fee_minor", nullable: true})
    smallOrderFeeMinor?: number | null;

    @Column("timestamp", {name: "observed_at", default: () => "CURRENT_TIMESTAMP"})
    observedAt!: Date;

    @Column("timestamp", {name: "expires_at", nullable: true})
    expiresAt?: Date | null;

    @Column("longtext", {name: "raw_payload_json", nullable: true})
    rawPayloadJson?: string | null;
}
