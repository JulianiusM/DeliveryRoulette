import {Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Unique} from "typeorm";
import {User} from "./User";
import {DietTag} from "../diet/DietTag";

@Entity("user_diet_preferences")
@Unique("UQ_user_diet_preference_user_tag", ["userId", "dietTagId"])
export class UserDietPreference {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @ManyToOne(() => User, {onDelete: "CASCADE"})
    @JoinColumn({name: "user_id"})
    user!: User;

    @Column("int", {name: "user_id"})
    userId!: number;

    @ManyToOne(() => DietTag, {onDelete: "CASCADE"})
    @JoinColumn({name: "diet_tag_id"})
    dietTag!: DietTag;

    @Column({name: "diet_tag_id"})
    dietTagId!: string;

    @Column("timestamp", {
        name: "created_at",
        default: () => "CURRENT_TIMESTAMP",
    })
    createdAt!: Date;
}
