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
  return db.addIndex('role_permissions','index_role_permissions_role_uuid_permission_id',[
  	'role_uuid',
  	'permission_id',
  ],true);
};

exports.down = function(db) {
  return db.removeIndex('role_permissions','index_role_permissions_role_uuid_permission_id');
};

exports._meta = {
  "version": 1
};