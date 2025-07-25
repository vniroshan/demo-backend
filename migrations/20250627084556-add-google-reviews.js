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
  return db.createTable("google_reviews", {
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
    author_name: {
      type: "string",
      notNull: true,
    },
    rating: {
      type: "int",
      notNull: true,
    },
    text: {
      type: "text",
    },
    relative_time_description: {
      type: "text",
    },
    type: {
      type: "string",
      notNull: true,
      defaultValue: "google",
    },
    location_uuid: {
      type: "string",
      unsigned: true,
      notNull: true,
      foreignKey: {
        name: "reviews_locations_location_uuid_foreign",
        table: "locations",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    profile_image_url: {
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
  return db.dropTable("google_reviews");
};

exports._meta = {
  version: 1,
};
