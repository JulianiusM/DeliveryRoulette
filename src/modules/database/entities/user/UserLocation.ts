import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "./User";

@Entity("user_locations")
export class UserLocation {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, {onDelete: "CASCADE"})
    @JoinColumn({name: "user_id"})
    user!: User;

    @Column("int", {name: "user_id"})
    userId!: number;

    @Column("varchar", {name: "label", length: 150})
    label!: string;

    @Column("varchar", {name: "address_line1", length: 255, nullable: true})
    addressLine1?: string | null;

    @Column("varchar", {name: "address_line2", length: 255, nullable: true})
    addressLine2?: string | null;

    @Column("varchar", {name: "city", length: 100, nullable: true})
    city?: string | null;

    @Column("varchar", {name: "postal_code", length: 20, nullable: true})
    postalCode?: string | null;

    @Column("varchar", {name: "country", length: 100, nullable: true})
    country?: string | null;

    @Column("double", {name: "latitude", nullable: true})
    latitude?: number | null;

    @Column("double", {name: "longitude", nullable: true})
    longitude?: number | null;

    @Column("tinyint", {
        name: "is_default",
        width: 1,
        default: 0,
    })
    isDefault!: boolean;

    @Column("timestamp", {name: "last_used_at", nullable: true})
    lastUsedAt?: Date | null;

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
