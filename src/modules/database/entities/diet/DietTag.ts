import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {DietTagKeyword} from "./DietTagKeyword";
import {DietTagDish} from "./DietTagDish";
import {DietTagAllergenExclusion} from "./DietTagAllergenExclusion";
import {DietTagNegativeKeyword} from "./DietTagNegativeKeyword";
import {DietTagStrongSignal} from "./DietTagStrongSignal";
import {DietTagContradictionPattern} from "./DietTagContradictionPattern";
import {DietTagQualifiedNegException} from "./DietTagQualifiedNegException";

@Entity("diet_tags")
export class DietTag {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("varchar", {name: "key", length: 50, unique: true})
    key!: string;

    @Column("varchar", {name: "label", length: 100})
    label!: string;

    /** Key of the parent diet tag for subdiet inheritance (e.g. VEGAN → VEGETARIAN). */
    @Column("varchar", {name: "parent_tag_key", length: 50, nullable: true})
    parentTagKey!: string | null;

    @OneToMany(() => DietTagKeyword, (kw) => kw.dietTag, {cascade: true})
    keywords!: DietTagKeyword[];

    @OneToMany(() => DietTagDish, (dish) => dish.dietTag, {cascade: true})
    dishes!: DietTagDish[];

    @OneToMany(() => DietTagAllergenExclusion, (ae) => ae.dietTag, {cascade: true})
    allergenExclusions!: DietTagAllergenExclusion[];

    @OneToMany(() => DietTagNegativeKeyword, (nk) => nk.dietTag, {cascade: true})
    negativeKeywords!: DietTagNegativeKeyword[];

    @OneToMany(() => DietTagStrongSignal, (ss) => ss.dietTag, {cascade: true})
    strongSignals!: DietTagStrongSignal[];

    @OneToMany(() => DietTagContradictionPattern, (cp) => cp.dietTag, {cascade: true})
    contradictionPatterns!: DietTagContradictionPattern[];

    @OneToMany(() => DietTagQualifiedNegException, (qne) => qne.dietTag, {cascade: true})
    qualifiedNegExceptions!: DietTagQualifiedNegException[];

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
