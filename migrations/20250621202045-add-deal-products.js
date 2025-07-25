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
  return db.createTable("deal_products", {
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
    deal_uuid: {
      type: "string",
      notNull: true,
      foreignKey: {
        name: "deals_deals_products_deal_uuid_foreign",
        table: "deals",
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
        name: "deals_products_product_uuid_foreign",
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
    is_advance: {
      type: "boolean",
      defaultValue: false,
    },
    price: {
      type: "decimal",
      notNull: true,
    },
    currency: {
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
  return db.dropTable("deal_products");
};

exports._meta = {
  version: 1,
};
