import {Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Unique} from "typeorm";
import {Restaurant} from "../restaurant/Restaurant";
import {DietTag} from "./DietTag";

@Entity("diet_inference_results")
@Unique("UQ_diet_inference_restaurant_tag_version", ["restaurantId", "dietTagId", "engineVersion"])
export class DietInferenceResult {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => Restaurant, {onDelete: "CASCADE"})
    @JoinColumn({name: "restaurant_id"})
    restaurant!: Restaurant;

    @Column({name: "restaurant_id"})
    restaurantId!: string;

    @ManyToOne(() => DietTag, {onDelete: "CASCADE"})
    @JoinColumn({name: "diet_tag_id"})
    dietTag!: DietTag;

    @Column({name: "diet_tag_id"})
    dietTagId!: string;

    @Column("int", {name: "score"})
    score!: number;

    @Column("varchar", {name: "confidence", length: 10})
    confidence!: "LOW" | "MEDIUM" | "HIGH";

    @Column("text", {name: "reasons_json"})
    reasonsJson!: string;

    @Column("varchar", {name: "engine_version", length: 20})
    engineVersion!: string;

    @Column("timestamp", {
        name: "computed_at",
        default: () => "CURRENT_TIMESTAMP",
    })
    computedAt!: Date;
}
