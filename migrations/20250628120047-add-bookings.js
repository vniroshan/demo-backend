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
  return db.createTable("bookings", {
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
    first_name: {
      type: "string",
      notNull: true,
    },
    last_name: {
      type: "string",
      notNull: true,
    },
    email: {
      type: "string",
      notNull: true,
    },
    mobile: {
      type: "string",
      notNull: true,
    },
    date: {
      type: "string",
      notNull: true,
    },
    time_start: {
      type: "string",
      notNull: true,
    },
    time_end: {
      type: "string",
      notNull: true,
    },
    technician_uuid: {
      type: "string",
      unsigned: true,
      notNull: true,
      foreignKey: {
        name: "bookings_technician_uuid_foreign",
        table: "technicians",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    status: {
      type: "string",
      defaultValue: "pending",
    },
    google_meeting_link: {
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
  return db.dropTable("bookings");
};

exports._meta = {
  version: 1,
};
