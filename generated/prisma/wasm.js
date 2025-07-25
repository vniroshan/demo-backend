
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.MigrationsScalarFieldEnum = {
  id: 'id',
  name: 'name',
  run_on: 'run_on'
};

exports.Prisma.AdminsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  name: 'name',
  email: 'email',
  mobile: 'mobile',
  country_code: 'country_code',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.CountriesScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  name: 'name',
  code: 'code',
  currency: 'currency',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.ModelsScalarFieldEnum = {
  id: 'id',
  name: 'name',
  key: 'key',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.PermissionsScalarFieldEnum = {
  id: 'id',
  name: 'name',
  model_id: 'model_id',
  description: 'description',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Role_permissionsScalarFieldEnum = {
  id: 'id',
  role_uuid: 'role_uuid',
  permission_id: 'permission_id',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.RolesScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  name: 'name',
  account_type: 'account_type',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.SeedsScalarFieldEnum = {
  id: 'id',
  model: 'model',
  model_id: 'model_id',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.TechniciansScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  hubspot_id: 'hubspot_id',
  name: 'name',
  email: 'email',
  mobile: 'mobile',
  country_code: 'country_code',
  deal_map_name: 'deal_map_name',
  google_group_link: 'google_group_link',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.UsersScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  email: 'email',
  role_uuid: 'role_uuid',
  admin_uuid: 'admin_uuid',
  technician_uuid: 'technician_uuid',
  is_active: 'is_active',
  profile_image_url: 'profile_image_url',
  google_calendar_token: 'google_calendar_token',
  last_login_at: 'last_login_at',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Activity_logsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  user_uuid: 'user_uuid',
  action: 'action',
  model: 'model',
  model_id: 'model_id',
  url: 'url',
  description: 'description',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.CustomersScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  hubspot_id: 'hubspot_id',
  first_name: 'first_name',
  last_name: 'last_name',
  email: 'email',
  mobile: 'mobile',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Technician_processScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  hubspot_id: 'hubspot_id',
  name: 'name',
  sort: 'sort',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Technician_process_optionsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  name: 'name',
  sort: 'sort',
  technician_process_uuid: 'technician_process_uuid',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.ProductsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  hubspot_id: 'hubspot_id',
  name: 'name',
  sort: 'sort',
  price: 'price',
  currency: 'currency',
  country_code: 'country_code',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Technician_ordersScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  name: 'name',
  technician_uuid: 'technician_uuid',
  deal_uuid: 'deal_uuid',
  technician_process_uuid: 'technician_process_uuid',
  technician_process_option_uuid: 'technician_process_option_uuid',
  product_image_url: 'product_image_url',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at',
  status: 'status'
};

exports.Prisma.LocationsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  name: 'name',
  slug: 'slug',
  address: 'address',
  mobile: 'mobile',
  email: 'email',
  open_days: 'open_days',
  coor_lat: 'coor_lat',
  coor_long: 'coor_long',
  description: 'description',
  country_code: 'country_code',
  technician_uuid: 'technician_uuid',
  website_link: 'website_link',
  review_link: 'review_link',
  place_id: 'place_id',
  logo: 'logo',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Deal_productsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  hubspot_id: 'hubspot_id',
  deal_uuid: 'deal_uuid',
  product_uuid: 'product_uuid',
  quantity: 'quantity',
  is_advance: 'is_advance',
  price: 'price',
  currency: 'currency',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.DealsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  hubspot_id: 'hubspot_id',
  hubspot_owner_id: 'hubspot_owner_id',
  name: 'name',
  customer_uuid: 'customer_uuid',
  country_code: 'country_code',
  technician_uuid: 'technician_uuid',
  price: 'price',
  price_paid: 'price_paid',
  currency: 'currency',
  pipeline_stage_uuid: 'pipeline_stage_uuid',
  technician_process_uuid: 'technician_process_uuid',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Technician_order_productsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  technician_order_uuid: 'technician_order_uuid',
  product_uuid: 'product_uuid',
  quantity: 'quantity',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Technician_productsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  technician_uuid: 'technician_uuid',
  product_uuid: 'product_uuid',
  price: 'price',
  stock: 'stock',
  is_inventory: 'is_inventory',
  currency: 'currency',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Wise_usersScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  wise_id: 'wise_id',
  profile: 'profile',
  name: 'name',
  email: 'email',
  country_code: 'country_code',
  currency: 'currency',
  technician_uuid: 'technician_uuid',
  is_default: 'is_default',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Technician_invoice_productsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  product_uuid: 'product_uuid',
  quantity: 'quantity',
  price: 'price',
  technician_invoice_uuid: 'technician_invoice_uuid',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Technician_invoicesScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  technician_uuid: 'technician_uuid',
  technician_order_uuid: 'technician_order_uuid',
  price: 'price',
  status: 'status',
  description: 'description',
  invoice_link: 'invoice_link',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at',
  admin_note: 'admin_note'
};

exports.Prisma.Wise_transactionsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  technician_uuid: 'technician_uuid',
  wise_user_uuid: 'wise_user_uuid',
  wise_transfer_id: 'wise_transfer_id',
  wise_quote_id: 'wise_quote_id',
  amount: 'amount',
  currency: 'currency',
  reference: 'reference',
  status: 'status',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.UtilsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  key: 'key',
  value: 'value',
  country_code: 'country_code',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Google_reviewsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  author_name: 'author_name',
  rating: 'rating',
  text: 'text',
  relative_time_description: 'relative_time_description',
  type: 'type',
  location_uuid: 'location_uuid',
  profile_image_url: 'profile_image_url',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.BookingsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  first_name: 'first_name',
  last_name: 'last_name',
  email: 'email',
  mobile: 'mobile',
  date: 'date',
  time_start: 'time_start',
  time_end: 'time_end',
  technician_uuid: 'technician_uuid',
  status: 'status',
  google_meeting_link: 'google_meeting_link',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Wise_jarsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  wise_balance_id: 'wise_balance_id',
  profile: 'profile',
  name: 'name',
  type: 'type',
  country_code: 'country_code',
  currency: 'currency',
  transfer_percent: 'transfer_percent',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Pipeline_stagesScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  hubspot_id: 'hubspot_id',
  name: 'name',
  type: 'type',
  sort: 'sort',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Wise_jar_transactionsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  deal_uuid: 'deal_uuid',
  wise_jar_uuid: 'wise_jar_uuid',
  wise_transfer_id: 'wise_transfer_id',
  wise_quote_id: 'wise_quote_id',
  amount: 'amount',
  currency: 'currency',
  reference: 'reference',
  status: 'status',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Technician_mail_templatesScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  title: 'title',
  body: 'body',
  technician_uuid: 'technician_uuid',
  is_default: 'is_default',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Stripe_transactionsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  technician_uuid: 'technician_uuid',
  deal_uuid: 'deal_uuid',
  stripe_invoice_id: 'stripe_invoice_id',
  total_amount: 'total_amount',
  paid_amount: 'paid_amount',
  total_amount_excluding_tax: 'total_amount_excluding_tax',
  currency: 'currency',
  reference: 'reference',
  status: 'status',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Technician_paymentsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  technician_uuid: 'technician_uuid',
  technician_order_uuid: 'technician_order_uuid',
  technician_invoice_uuid: 'technician_invoice_uuid',
  invoice_amount: 'invoice_amount',
  paid_amount: 'paid_amount',
  salary_percent: 'salary_percent',
  status: 'status',
  description: 'description',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.Stripe_payoutsScalarFieldEnum = {
  id: 'id',
  uuid: 'uuid',
  stripe_payout_id: 'stripe_payout_id',
  total_amount: 'total_amount',
  currency: 'currency',
  country_code: 'country_code',
  reference: 'reference',
  status: 'status',
  created_at: 'created_at',
  modified_at: 'modified_at',
  deleted_at: 'deleted_at'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};


exports.Prisma.ModelName = {
  migrations: 'migrations',
  admins: 'admins',
  countries: 'countries',
  models: 'models',
  permissions: 'permissions',
  role_permissions: 'role_permissions',
  roles: 'roles',
  seeds: 'seeds',
  technicians: 'technicians',
  users: 'users',
  activity_logs: 'activity_logs',
  customers: 'customers',
  technician_process: 'technician_process',
  technician_process_options: 'technician_process_options',
  products: 'products',
  technician_orders: 'technician_orders',
  locations: 'locations',
  deal_products: 'deal_products',
  deals: 'deals',
  technician_order_products: 'technician_order_products',
  technician_products: 'technician_products',
  wise_users: 'wise_users',
  technician_invoice_products: 'technician_invoice_products',
  technician_invoices: 'technician_invoices',
  wise_transactions: 'wise_transactions',
  utils: 'utils',
  google_reviews: 'google_reviews',
  bookings: 'bookings',
  wise_jars: 'wise_jars',
  pipeline_stages: 'pipeline_stages',
  wise_jar_transactions: 'wise_jar_transactions',
  technician_mail_templates: 'technician_mail_templates',
  stripe_transactions: 'stripe_transactions',
  technician_payments: 'technician_payments',
  stripe_payouts: 'stripe_payouts'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
