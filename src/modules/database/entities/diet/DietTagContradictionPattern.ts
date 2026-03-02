import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn} from 'typeorm';
import {DietTag} from './DietTag';

@Entity('diet_tag_contradiction_patterns')
export class DietTagContradictionPattern {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({name: 'diet_tag_id'})
    dietTagId!: string;

    @Column({type: 'varchar', length: 255})
    value!: string;

    @ManyToOne(() => DietTag, (tag) => tag.contradictionPatterns, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'diet_tag_id'})
    dietTag!: DietTag;
}
