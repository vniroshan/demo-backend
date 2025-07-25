'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  return db.addIndex('utils','Index_utils_key_country_code',[
  	'key',
  	'country_code',
  ],true);
};

exports.down = function(db) {
  return db.removeIndex('utils','Index_utils_key_country_code');
};

exports._meta = {
  "version": 1
};