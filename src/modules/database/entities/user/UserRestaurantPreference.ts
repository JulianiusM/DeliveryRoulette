import {Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Unique} from "typeorm";
import {User} from "./User";
import {Restaurant} from "../restaurant/Restaurant";

@Entity("user_restaurant_preferences")
@Unique("UQ_user_restaurant_preference_user_restaurant", ["userId", "restaurantId"])
export class UserRestaurantPreference {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, {onDelete: "CASCADE"})
    @JoinColumn({name: "user_id"})
    user!: User;

    @Column("int", {name: "user_id"})
    userId!: number;

    @ManyToOne(() => Restaurant, {onDelete: "CASCADE"})
    @JoinColumn({name: "restaurant_id"})
    restaurant!: Restaurant;

    @Column("varchar", {name: "restaurant_id", length: 36})
    restaurantId!: string;

    @Column("tinyint", {
        name: "is_favorite",
        width: 1,
        default: 0,
    })
    isFavorite!: boolean;

    @Column("tinyint", {
        name: "do_not_suggest",
        width: 1,
        default: 0,
    })
    doNotSuggest!: boolean;

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
