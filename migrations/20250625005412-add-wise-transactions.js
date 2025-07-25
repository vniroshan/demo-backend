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
  return db.createTable("wise_transactions", {
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
    technician_uuid: {
      type: "string",
      unsigned: true,
      notNull: true,
      foreignKey: {
        name: "wise_transactions_technician_uuid_foreign",
        table: "technicians",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    wise_user_uuid: {
      type: "string",
      unsigned: true,
      notNull: true,
      foreignKey: {
        name: "wise_transactions_wise_user_uuid_foreign",
        table: "wise_users",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    wise_transfer_id: {
      type: "string",
      notNull: true,
    },
    wise_quote_id: {
      type: "string",
      notNull: true,
    },
    amount: {
      type: "decimal",
      precision: 10,
      scale: 2,
      notNull: true,
    },
    currency: {
      type: "string",
      notNull: true,
    },
    reference: {
      type: "text",
    },
    status: {
      type: "string",
      notNull: true,
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
  return db.dropTable("wise_transactions");
};

exports._meta = {
  version: 1,
};
