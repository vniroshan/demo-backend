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
  return db.createTable("technician_invoice_products", {
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
    product_uuid: {
      type: "string",
      notNull: true,
      foreignKey: {
        name: "technician_products_technician_invoice_products_product_uuid_foreign",
        table: "products",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    quantity: {
      type: "int",
      defaultValue: 1,
    },
    price: {
      type: "decimal",
      notNull: true,
    },
    technician_invoice_uuid: {
      type: "string",
      notNull: true,
      foreignKey: {
        name: "technician_invoices_technician_order_products_technician_order_uuid_foreign",
        table: "technician_invoices",
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
  return db.dropTable("technician_invoice_products");
};

exports._meta = {
  version: 1,
};
