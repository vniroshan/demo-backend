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
  return db.createTable("stripe_transactions", {
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
        name: "stripe_transactions_technician_uuid_foreign",
        table: "technicians",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
      deal_uuid: {
      type: "string",
      notNull: true,
      foreignKey: {
        name: "deals_stripe_transactions_deal_uuid_foreign",
        table: "deals",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    stripe_invoice_id: {
      type: "string",
      notNull: true,
    },
     total_amount: {
      type: "decimal",
      precision: 10,
      scale: 2,
      notNull: true,
    },
    paid_amount: {
      type: "decimal",
      precision: 10,
      scale: 2,
      notNull: true,
    },
     total_amount_excluding_tax: {
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
  return db.dropTable("stripe_transactions");
};

exports._meta = {
  version: 1,
};
