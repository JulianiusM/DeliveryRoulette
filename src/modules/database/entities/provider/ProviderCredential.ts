import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {User} from "../user/User";

@Entity("provider_credentials")
export class ProviderCredential {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("varchar", {name: "provider_key", length: 100})
    providerKey!: string;

    @Column("varchar", {name: "credential_key", length: 100})
    credentialKey!: string;

    @Column("text", {name: "encrypted_value"})
    encryptedValue!: string;

    @ManyToOne(() => User, {onDelete: "CASCADE", nullable: true})
    @JoinColumn({name: "user_id"})
    user?: User | null;

    @Column("int", {name: "user_id", nullable: true})
    userId?: number | null;

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
