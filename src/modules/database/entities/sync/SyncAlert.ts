import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Restaurant} from "../restaurant/Restaurant";

export type SyncAlertType = 'restaurant_gone' | 'menu_changed' | 'diet_override_stale';

@Entity("sync_alerts")
export class SyncAlert {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Restaurant, {onDelete: "CASCADE"})
    @JoinColumn({name: "restaurant_id"})
    restaurant!: Restaurant;

    @Column({name: "restaurant_id"})
    restaurantId!: string;

    @Column("varchar", {name: "provider_key", length: 100})
    providerKey!: string;

    @Column("varchar", {name: "type", length: 50})
    type!: SyncAlertType;

    @Column("text", {name: "message"})
    message!: string;

    @Column("tinyint", {name: "dismissed", width: 1, default: 0})
    dismissed!: boolean;

    @Column("timestamp", {
        name: "created_at",
        default: () => "CURRENT_TIMESTAMP",
    })
    createdAt!: Date;
}
