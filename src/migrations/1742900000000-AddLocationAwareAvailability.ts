import {MigrationInterface, QueryRunner, Table, TableColumn, TableIndex} from 'typeorm';

export class AddLocationAwareAvailability1742900000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasColumn('restaurants', 'latitude'))) {
            await queryRunner.addColumn('restaurants', new TableColumn({
                name: 'latitude',
                type: 'double',
                isNullable: true,
            }));
        }

        if (!(await queryRunner.hasColumn('restaurants', 'longitude'))) {
            await queryRunner.addColumn('restaurants', new TableColumn({
                name: 'longitude',
                type: 'double',
                isNullable: true,
            }));
        }

        if (!(await queryRunner.hasColumn('restaurant_provider_refs', 'provider_native_id'))) {
            await queryRunner.addColumn('restaurant_provider_refs', new TableColumn({
                name: 'provider_native_id',
                type: 'varchar',
                length: '255',
                isNullable: true,
            }));
        }

        if (!(await queryRunner.hasColumn('restaurant_provider_refs', 'provider_identity_json'))) {
            await queryRunner.addColumn('restaurant_provider_refs', new TableColumn({
                name: 'provider_identity_json',
                type: 'longtext',
                isNullable: true,
            }));
        }

        const providerRefTable = await queryRunner.getTable('restaurant_provider_refs');
        const hasProviderNativeIndex = providerRefTable?.indices.some((index) => index.name === 'UQ_provider_native_id');
        if (!hasProviderNativeIndex) {
            await queryRunner.createIndex(
                'restaurant_provider_refs',
                new TableIndex({
                    name: 'UQ_provider_native_id',
                    columnNames: ['provider_key', 'provider_native_id'],
                    isUnique: true,
                }),
            );
        }

        if (!(await queryRunner.hasTable('user_locations'))) {
            await queryRunner.createTable(new Table({
                name: 'user_locations',
                columns: [
                    {
                        name: 'id',
                        type: 'varchar',
                        length: '36',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'uuid',
                    },
                    {
                        name: 'user_id',
                        type: 'int',
                    },
                    {
                        name: 'label',
                        type: 'varchar',
                        length: '150',
                    },
                    {
                        name: 'address_line1',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'address_line2',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'city',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'postal_code',
                        type: 'varchar',
                        length: '20',
                        isNullable: true,
                    },
                    {
                        name: 'country',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'latitude',
                        type: 'double',
                        isNullable: true,
                    },
                    {
                        name: 'longitude',
                        type: 'double',
                        isNullable: true,
                    },
                    {
                        name: 'is_default',
                        type: 'tinyint',
                        width: 1,
                        default: 0,
                    },
                    {
                        name: 'last_used_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['user_id'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
                indices: [
                    {
                        name: 'IDX_user_locations_user_id',
                        columnNames: ['user_id'],
                    },
                    {
                        name: 'IDX_user_locations_user_default',
                        columnNames: ['user_id', 'is_default'],
                    },
                ],
            }), true);
        }

        if (!(await queryRunner.hasTable('provider_location_refs'))) {
            await queryRunner.createTable(new Table({
                name: 'provider_location_refs',
                columns: [
                    {
                        name: 'id',
                        type: 'varchar',
                        length: '36',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'uuid',
                    },
                    {
                        name: 'source_location_id',
                        type: 'varchar',
                        length: '36',
                    },
                    {
                        name: 'provider_key',
                        type: 'varchar',
                        length: '100',
                    },
                    {
                        name: 'provider_area_id',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'provider_location_slug',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'latitude',
                        type: 'double',
                        isNullable: true,
                    },
                    {
                        name: 'longitude',
                        type: 'double',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        default: "'resolved'",
                    },
                    {
                        name: 'raw_resolution_json',
                        type: 'longtext',
                        isNullable: true,
                    },
                    {
                        name: 'last_resolved_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'expires_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['source_location_id'],
                        referencedTableName: 'user_locations',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
                indices: [
                    {
                        name: 'UQ_provider_location_refs_provider_source',
                        columnNames: ['provider_key', 'source_location_id'],
                        isUnique: true,
                    },
                    {
                        name: 'IDX_provider_location_refs_source_location_id',
                        columnNames: ['source_location_id'],
                    },
                ],
            }), true);
        }

        if (!(await queryRunner.hasTable('restaurant_provider_coverages'))) {
            await queryRunner.createTable(new Table({
                name: 'restaurant_provider_coverages',
                columns: [
                    {
                        name: 'id',
                        type: 'varchar',
                        length: '36',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'uuid',
                    },
                    {
                        name: 'restaurant_id',
                        type: 'varchar',
                        length: '36',
                    },
                    {
                        name: 'restaurant_provider_ref_id',
                        type: 'varchar',
                        length: '36',
                    },
                    {
                        name: 'provider_location_ref_id',
                        type: 'varchar',
                        length: '36',
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '50',
                        default: "'active'",
                    },
                    {
                        name: 'first_seen_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'last_seen_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'source_url',
                        type: 'varchar',
                        length: '500',
                        isNullable: true,
                    },
                    {
                        name: 'raw_listing_json',
                        type: 'longtext',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['restaurant_id'],
                        referencedTableName: 'restaurants',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                    {
                        columnNames: ['restaurant_provider_ref_id'],
                        referencedTableName: 'restaurant_provider_refs',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                    {
                        columnNames: ['provider_location_ref_id'],
                        referencedTableName: 'provider_location_refs',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
                indices: [
                    {
                        name: 'UQ_restaurant_provider_coverage_ref_location',
                        columnNames: ['restaurant_provider_ref_id', 'provider_location_ref_id'],
                        isUnique: true,
                    },
                    {
                        name: 'IDX_restaurant_provider_coverages_restaurant_id',
                        columnNames: ['restaurant_id'],
                    },
                    {
                        name: 'IDX_restaurant_provider_coverages_location_ref_id',
                        columnNames: ['provider_location_ref_id'],
                    },
                ],
            }), true);
        }

        if (!(await queryRunner.hasTable('restaurant_provider_service_snapshots'))) {
            await queryRunner.createTable(new Table({
                name: 'restaurant_provider_service_snapshots',
                columns: [
                    {
                        name: 'id',
                        type: 'varchar',
                        length: '36',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'uuid',
                    },
                    {
                        name: 'coverage_id',
                        type: 'varchar',
                        length: '36',
                    },
                    {
                        name: 'service_type',
                        type: 'varchar',
                        length: '50',
                    },
                    {
                        name: 'is_available',
                        type: 'tinyint',
                        width: 1,
                        default: 0,
                    },
                    {
                        name: 'is_temporary_offline',
                        type: 'tinyint',
                        width: 1,
                        default: 0,
                    },
                    {
                        name: 'is_throttled',
                        type: 'tinyint',
                        width: 1,
                        default: 0,
                    },
                    {
                        name: 'eta_min',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'eta_max',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'min_order_amount_minor',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'currency',
                        type: 'varchar',
                        length: '10',
                        isNullable: true,
                    },
                    {
                        name: 'fee_bands_json',
                        type: 'longtext',
                        isNullable: true,
                    },
                    {
                        name: 'bag_fee_minor',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'service_fee_minor',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'small_order_fee_minor',
                        type: 'int',
                        isNullable: true,
                    },
                    {
                        name: 'observed_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'expires_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'raw_payload_json',
                        type: 'longtext',
                        isNullable: true,
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['coverage_id'],
                        referencedTableName: 'restaurant_provider_coverages',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
                indices: [
                    {
                        name: 'IDX_rpss_coverage_service_observed',
                        columnNames: ['coverage_id', 'service_type', 'observed_at'],
                    },
                    {
                        name: 'IDX_rpss_expires_at',
                        columnNames: ['expires_at'],
                    },
                ],
            }), true);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        if (await queryRunner.hasTable('restaurant_provider_service_snapshots')) {
            await queryRunner.dropTable('restaurant_provider_service_snapshots', true);
        }

        if (await queryRunner.hasTable('restaurant_provider_coverages')) {
            await queryRunner.dropTable('restaurant_provider_coverages', true);
        }

        if (await queryRunner.hasTable('provider_location_refs')) {
            await queryRunner.dropTable('provider_location_refs', true);
        }

        if (await queryRunner.hasTable('user_locations')) {
            await queryRunner.dropTable('user_locations', true);
        }

        const providerRefTable = await queryRunner.getTable('restaurant_provider_refs');
        const hasProviderNativeIndex = providerRefTable?.indices.some((index) => index.name === 'UQ_provider_native_id');
        if (hasProviderNativeIndex) {
            await queryRunner.dropIndex('restaurant_provider_refs', 'UQ_provider_native_id');
        }

        if (await queryRunner.hasColumn('restaurant_provider_refs', 'provider_identity_json')) {
            await queryRunner.dropColumn('restaurant_provider_refs', 'provider_identity_json');
        }

        if (await queryRunner.hasColumn('restaurant_provider_refs', 'provider_native_id')) {
            await queryRunner.dropColumn('restaurant_provider_refs', 'provider_native_id');
        }

        if (await queryRunner.hasColumn('restaurants', 'longitude')) {
            await queryRunner.dropColumn('restaurants', 'longitude');
        }

        if (await queryRunner.hasColumn('restaurants', 'latitude')) {
            await queryRunner.dropColumn('restaurants', 'latitude');
        }
    }
}
