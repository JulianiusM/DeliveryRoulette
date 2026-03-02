import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {DietTagKeyword} from "./DietTagKeyword";
import {DietTagDish} from "./DietTagDish";
import {DietTagAllergenExclusion} from "./DietTagAllergenExclusion";

@Entity("diet_tags")
export class DietTag {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("varchar", {name: "key", length: 50, unique: true})
    key!: string;

    @Column("varchar", {name: "label", length: 100})
    label!: string;

    @OneToMany(() => DietTagKeyword, (kw) => kw.dietTag, {cascade: true, eager: true})
    keywords!: DietTagKeyword[];

    @OneToMany(() => DietTagDish, (dish) => dish.dietTag, {cascade: true, eager: true})
    dishes!: DietTagDish[];

    @OneToMany(() => DietTagAllergenExclusion, (ae) => ae.dietTag, {cascade: true, eager: true})
    allergenExclusions!: DietTagAllergenExclusion[];

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
