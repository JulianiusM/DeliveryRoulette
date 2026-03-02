import {Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn} from "typeorm";
import {Restaurant} from "./Restaurant";

@Entity("restaurant_cuisines")
export class RestaurantCuisine {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Restaurant, (r) => r.providerCuisines, {onDelete: "CASCADE"})
    @JoinColumn({name: "restaurant_id"})
    restaurant!: Restaurant;

    @Column({name: "restaurant_id"})
    restaurantId!: string;

    @Column("varchar", {name: "value", length: 150})
    value!: string;

    @Column("varchar", {name: "source", length: 20, default: "provider"})
    source!: string;
}
