"use strict";

const moment = require("moment");
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
  return db.createTable("technician_orders", {
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
    name: {
      type: "string",
      notNull: true,
    },
    technician_uuid: {
      type: "string",
      unsigned: true,
      notNull: true,
      foreignKey: {
        name: "technicians_orders_technician_uuid_foreign",
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
      unsigned: true,
      notNull: true,
      foreignKey: {
        name: "deals_technician_orders_deal_uuid_foreign",
        table: "deals",
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
      notNull: true,
      foreignKey: {
        name: "technician_process_orders_technician_process_uuid_foreign",
        table: "technician_process",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    technician_process_option_uuid: {
      type: "string",
      unsigned: true,
      foreignKey: {
        name: "technician_process_options_orders_technician_process_uuid_foreign",
        table: "technician_process_options",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    product_image_url: {
      type: "text",
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
  return db.dropTable("technician_orders");
};

exports._meta = {
  version: 1,
};
