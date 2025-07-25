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
  return db.createTable("users", {
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
    email: {
      type: "string",
      notNull: true,
      unique: true,
    },
     role_uuid: {
      type: "string",
      notNull: true,
      foreignKey: {
        name: "users_roles_role_uuid_foreign",
        table: "roles",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    admin_uuid: {
      type: "string",
      foreignKey: {
        name: "admins_users_admin_uuid_foreign",
        table: "admins",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    technician_uuid: {
      type: "string",
      unsigned: true,
      foreignKey: {
        name: "technicians_users_technician_uuid_foreign",
        table: "technicians",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    is_active: {
      type: "boolean",
      defaultValue: true,
    },
    profile_image_url: {
      type: "text",
    },
     google_calendar_token: {
      type: "text",
    },
    last_login_at: {
      type: "timestamp",
      timezone: true,
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
  return db.dropTable("users");
};

exports._meta = {
  version: 1,
};
