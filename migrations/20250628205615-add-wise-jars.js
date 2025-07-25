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
  return db.createTable("wise_jars", {
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
    wise_balance_id: {
      type: "int",
      notNull: true,
      unique: true,
    },
    profile: {
      type: "int",
      notNull: true,
    },
    name: {
      type: "string",
      notNull: true,
    },
    type: {
      type: "string",
      notNull: true,
    },
    country_code: {
      type: "string",
    },
    currency: {
      type: "string",
    },
    transfer_percent: {
      type: "decimal",
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
  return db.dropTable("wise_jars");
};

exports._meta = {
  version: 1,
};
