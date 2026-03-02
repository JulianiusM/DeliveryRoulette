import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn} from 'typeorm';
import {DietTag} from './DietTag';

@Entity('diet_tag_strong_signals')
export class DietTagStrongSignal {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({name: 'diet_tag_id'})
    dietTagId!: string;

    @Column({type: 'varchar', length: 255})
    value!: string;

    @ManyToOne(() => DietTag, (tag) => tag.strongSignals, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'diet_tag_id'})
    dietTag!: DietTag;
}
