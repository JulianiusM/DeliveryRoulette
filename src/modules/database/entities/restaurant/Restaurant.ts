import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {RestaurantCuisine} from "./RestaurantCuisine";

@Entity("restaurants")
export class Restaurant {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("varchar", {name: "name", length: 150})
    name!: string;

    @Column("varchar", {name: "address_line1", length: 255})
    addressLine1!: string;

    @Column("varchar", {name: "address_line2", nullable: true, length: 255})
    addressLine2?: string | null;

    @Column("varchar", {name: "city", length: 100})
    city!: string;

    @Column("varchar", {name: "postal_code", length: 20})
    postalCode!: string;

    @Column("varchar", {name: "country", length: 100, default: ""})
    country!: string;

    @Column("text", {name: "opening_hours", nullable: true})
    openingHours?: string | null;

    @Column("varchar", {name: "opening_days", length: 255, nullable: true})
    openingDays?: string | null;

    @OneToMany(() => RestaurantCuisine, (rc) => rc.restaurant, {cascade: true})
    providerCuisines!: RestaurantCuisine[];

    @Column("text", {name: "cuisine_inference_json", nullable: true})
    cuisineInferenceJson?: string | null;

    @Column("tinyint", {
        name: "is_active",
        width: 1,
        default: 1,
    })
    isActive!: boolean;

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
