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
  return db.createTable("locations", {
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
    slug: {
      type: "string",
      unique: true,
      notNull: true,
    },
    address: {
      type: "string",
      notNull: true,
    },
    mobile: {
      type: "string",
      notNull: true,
    },
    email: {
      type: "string",
      notNull: true,
    },
    open_days: {
      type: "string",
      notNull: true,
    },
    coor_lat: {
      type: "string",
      notNull: true,
    },
    coor_long: {
      type: "string",
      notNull: true,
    },
    description: {
      type: "text",
    },
    country_code: {
      type: "string",
      unsigned: true,
      foreignKey: {
        name: "locations_countries_country_code_foreign",
        table: "countries",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "code",
      },
    },
    technician_uuid: {
      type: "string",
      unsigned: true,
      foreignKey: {
        name: "technicians_locations_technician_uuid_foreign",
        table: "technicians",
        rules: {
          onDelete: "CASCADE",
          onUpdate: "RESTRICT",
        },
        mapping: "uuid",
      },
    },
    website_link: {
      type: "text",
    },
    review_link: {
      type: "text",
    },
    place_id: {
      type: "text",
    },
    logo: {
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
  return db.dropTable("locations");
};

exports._meta = {
  version: 1,
};
