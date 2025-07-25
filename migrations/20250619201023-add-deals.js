"use strict";

var dbm;
var type;
var seed;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function (options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db) {
  return db.createTable("deals", {
    id: {
      type: "int",
      unsigned: true,
      notNull: true,
      primaryKey: true,
      autoIncrement: true,
    },
    uuid: {
      type: "string",
      notNull: true,
      unique: true,
    },
    hubspot_id: {
      type: "string",
      notNull: true,
      unique: true,
    },
    hubspot_owner_id: {
      type: "string",
      notNull: true,
    },
    name: {
      type: "string",
      notNull: true,
      unique: true,
    },
    customer_uuid: {
      type: "string",
      unsigned: true,
      notNull: true,
      foreignKey: {
        name: "deals_customers_uuid_foreign",
        table: "customers",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    country_code: {
      type: "string",
      unsigned: true,
      foreignKey: {
        name: "deals_countries_country_code_foreign",
        table: "countries",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "code",
      },
    },
    technician_uuid: {
      type: "string",
      unsigned: true,
      notNull: true,
      foreignKey: {
        name: "deals_technicians_uuid_foreign",
        table: "technicians",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    price: {
      type: "decimal",
    },
    price_paid: {
      type: "decimal",
    },
    currency: {
      type: "string",
      notNull: true,
    },
    pipeline_stage_uuid: {
      type: "string",
      unsigned: true,
      foreignKey: {
        name: "pipeline_stages_deals_technician_uuid_foreign",
        table: "pipeline_stages",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    technician_process_uuid: {
      type: "string",
      unsigned: true,
      foreignKey: {
        name: "technician_process_deals_technician_uuid_foreign",
        table: "technician_process",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    created_at: {
      type: "timestamp",
      timezone: true,
      null: true,
    },
    modified_at: {
      type: "timestamp",
      timezone: true,
      null: true,
    },
    deleted_at: {
      type: "timestamp",
      timezone: true,
      null: true,
    },
  });
};

exports.down = function (db) {
  return db.dropTable("deals");
};

exports._meta = {
  version: 1,
};
