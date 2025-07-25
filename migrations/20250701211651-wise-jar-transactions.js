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
  return db.createTable("wise_jar_transactions", {
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
    deal_uuid: {
      type: "string",
      unsigned: true,
      notNull: true,
      foreignKey: {
        name: "deals_wise_jar_transactions_deal_uuid_foreign",
        table: "deals",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    wise_jar_uuid: {
      type: "string",
      unsigned: true,
      notNull: true,
      foreignKey: {
        name: "wise_jar_transactions_wise_jar_uuid_foreign",
        table: "wise_jars",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    wise_transfer_id: {
      type: "string",
    },
    wise_quote_id: {
      type: "string",
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
  return db.dropTable("wise_jar_transactions");
};

exports._meta = {
  version: 1,
};
