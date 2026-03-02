import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn} from 'typeorm';
import {DietTag} from './DietTag';

@Entity('diet_tag_negative_keywords')
export class DietTagNegativeKeyword {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({name: 'diet_tag_id'})
    dietTagId!: string;

    @Column({type: 'varchar', length: 255})
    value!: string;

    @ManyToOne(() => DietTag, (tag) => tag.negativeKeywords, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'diet_tag_id'})
    dietTag!: DietTag;
}
