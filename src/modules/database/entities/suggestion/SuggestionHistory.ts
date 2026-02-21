import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity("suggestion_history")
export class SuggestionHistory {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("varchar", {name: "restaurant_id", length: 36})
    restaurantId!: string;

    @Column("int", {name: "user_id", nullable: true})
    userId?: number | null;

    @Column("timestamp", {
        name: "suggested_at",
        default: () => "CURRENT_TIMESTAMP",
    })
    suggestedAt!: Date;
}
