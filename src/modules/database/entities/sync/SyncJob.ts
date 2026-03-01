import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

export type SyncJobStatus = "pending" | "in_progress" | "completed" | "failed";

@Entity("sync_jobs")
export class SyncJob {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("varchar", {name: "provider_key", length: 100, nullable: true})
    providerKey?: string | null;

    @Column("varchar", {name: "status", length: 50, default: "pending"})
    status!: SyncJobStatus;

    @Column("int", {name: "restaurants_synced", default: 0})
    restaurantsSynced!: number;

    @Column("text", {name: "error_message", nullable: true})
    errorMessage?: string | null;

    @Column("text", {name: "sync_query", nullable: true})
    syncQuery?: string | null;

    @Column("timestamp", {
        name: "started_at",
        nullable: true,
    })
    startedAt?: Date | null;

    @Column("timestamp", {
        name: "finished_at",
        nullable: true,
    })
    finishedAt?: Date | null;

    @Column("timestamp", {
        name: "created_at",
        default: () => "CURRENT_TIMESTAMP",
    })
    createdAt!: Date;
}
