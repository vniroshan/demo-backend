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
  return db.createTable("technician_order_products", {
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
    technician_order_uuid: {
      type: "string",
      notNull: true,
      foreignKey: {
        name: "technician_orders_technician_order_products_technician_order_uuid_foreign",
        table: "technician_orders",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    product_uuid: {
      type: "string",
      notNull: true,
      foreignKey: {
        name: "technician_order_products_products_product_uuid_foreign",
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
  return db.dropTable("technician_order_products");
};

exports._meta = {
  version: 1,
};
