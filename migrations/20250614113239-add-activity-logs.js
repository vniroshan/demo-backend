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
  return db.createTable("activity_logs", {
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
    user_uuid: {
      type: "string",
      notNull: true,
      foreignKey: {
        name: "activity_logs_users_user_uuid_foreign",
        table: "users",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    action: {
      type: "string",
      notNull: true,
    },
    model: {
      type: "string",
      notNull: true,
    },
    model_id: {
      type: "int",
      unsigned: true,
    },
    url: {
      type: "text",
      null: true,
    },
    description: {
      type: "string",
      null: true,
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
  return db.dropTable("activity_logs");
};

exports._meta = {
  version: 1,
};
