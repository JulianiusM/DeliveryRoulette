import {Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "./User";

@Entity("user_preferences")
export class UserPreference {
    @PrimaryGeneratedColumn({type: "int", name: "id"})
    id!: number;

    @Column("int", {name: "user_id", unique: true})
    userId!: number;

    @OneToOne(() => User)
    @JoinColumn({name: "user_id"})
    user?: User;

    @Column("varchar", {name: "delivery_area", length: 150, default: ""})
    deliveryArea!: string;

    @Column("text", {name: "cuisine_includes", nullable: true})
    cuisineIncludes?: string | null;

    @Column("text", {name: "cuisine_excludes", nullable: true})
    cuisineExcludes?: string | null;

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
