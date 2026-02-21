export const ROLE_SUPER_ADMIN = "ROLE_SUPER_ADMIN";
export const ROLE_ADMIN = "ROLE_ADMIN";
export const ROLE_USER = "ROLE_USER";
export const ROLE_PRODUCTION_ADMIN = "ROLE_PRODUCTION_ADMIN";
export const ROLE_PRODUCTION_USER = "ROLE_PRODUCTION_USER";
export const ROLE_INVENTORY_ADMIN = "ROLE_INVENTORY_ADMIN";
export const ROLE_INVENTORY_USER = "ROLE_INVENTORY_USER";
export const ROLE_PURCHASE_ADMIN = "ROLE_PURCHASE_ADMIN";
export const ROLE_PURCHASE_USER = "ROLE_PURCHASE_USER";
export const ROLE_SALES_ADMIN = "ROLE_SALES_ADMIN";
export const ROLE_SALES_USER = "ROLE_SALES_USER";

export const ADMIN_ROLES = [ROLE_SUPER_ADMIN, ROLE_ADMIN];

export const USER_ROLE_OPTIONS = [
    ROLE_SUPER_ADMIN,
    ROLE_ADMIN,
    ROLE_USER,
    ROLE_PRODUCTION_ADMIN,
    ROLE_PRODUCTION_USER,
    ROLE_INVENTORY_ADMIN,
    ROLE_INVENTORY_USER,
    ROLE_PURCHASE_ADMIN,
    ROLE_PURCHASE_USER,
    ROLE_SALES_ADMIN,
    ROLE_SALES_USER,
];
export const CREATE_USER_ROLE_OPTIONS = USER_ROLE_OPTIONS.filter(
    (role) => role !== ROLE_SUPER_ADMIN
);
export const ASSIGNABLE_ROLE_OPTIONS = USER_ROLE_OPTIONS.filter(
    (role) => role !== ROLE_SUPER_ADMIN
);

export const SALES_ACCESS_ROLES = [
    ...ADMIN_ROLES,
    ROLE_USER,
    ROLE_SALES_ADMIN,
    ROLE_SALES_USER,
];
export const SALES_MANAGE_ROLES = [...ADMIN_ROLES, ROLE_SALES_ADMIN];

export const INVENTORY_ACCESS_ROLES = [
    ...ADMIN_ROLES,
    ROLE_USER,
    ROLE_INVENTORY_ADMIN,
    ROLE_INVENTORY_USER,
];
export const INVENTORY_MANAGE_ROLES = [...ADMIN_ROLES, ROLE_USER, ROLE_INVENTORY_ADMIN];

export const PRODUCTION_APPROVAL_ROLES = [...ADMIN_ROLES, ROLE_PRODUCTION_ADMIN];

export const INVENTORY_ITEM_APPROVAL_ROLES = [...ADMIN_ROLES, ROLE_INVENTORY_ADMIN];

export const PRODUCTION_ACCESS_ROLES = [
    ...ADMIN_ROLES,
    ROLE_USER,
    ROLE_PRODUCTION_ADMIN,
    ROLE_PRODUCTION_USER,
];
export const PRODUCTION_MANAGE_ROLES = [...ADMIN_ROLES, ROLE_USER, ROLE_PRODUCTION_ADMIN];

export const ITEM_CODE_MAPPING_ACCESS_ROLES = [
    ...ADMIN_ROLES,
    ROLE_USER,
    ROLE_PRODUCTION_ADMIN,
    ROLE_PRODUCTION_USER,
    ROLE_INVENTORY_ADMIN,
    ROLE_INVENTORY_USER,
    ROLE_PURCHASE_ADMIN,
    ROLE_PURCHASE_USER,
    ROLE_SALES_ADMIN,
    ROLE_SALES_USER,
];
export const ITEM_CODE_MAPPING_MANAGE_ROLES = [
    ...ADMIN_ROLES,
    ROLE_PRODUCTION_ADMIN,
    ROLE_INVENTORY_ADMIN,
    ROLE_PURCHASE_ADMIN,
    ROLE_SALES_ADMIN,
];

export const USER_MANAGEMENT_ACCESS_ROLES = [...ADMIN_ROLES];

export const MODULE_KEYS = {
    PRODUCT_MASTER: "productMaster",
    BOM: "bom",
    MANUFACTURING: "manufacturing",
    INVENTORY: "inventory",
    SALES: "sales",
    WORK_ORDER: "workOrder",
    PRODUCTION_JOB: "productionJob",
    ROUTING: "routing",
    ITEM_CODE_MAPPING: "itemCodeMapping",
    USER_MANAGEMENT: "userManagement",
};

export const ACTION_KEYS = {
    INVENTORY_ITEM_WRITE: "inventory.item.write",
    INVENTORY_APPROVAL_WRITE: "inventory.approval.write",
    INVENTORY_PROCUREMENT_WRITE: "inventory.procurement.write",
    WORK_ORDER_ADMIN_WRITE: "workOrder.admin.write",
    ROUTING_LIFECYCLE_WRITE: "routing.lifecycle.write",
    BOM_STATUS_VERSION_WRITE: "bom.status.version.write",
    ITEM_CODE_MAPPING_WRITE: "itemCodeMapping.write",
};

const MODULE_ROLE_MAP = {
    [MODULE_KEYS.PRODUCT_MASTER]: ITEM_CODE_MAPPING_ACCESS_ROLES,
    [MODULE_KEYS.BOM]: PRODUCTION_ACCESS_ROLES,
    [MODULE_KEYS.MANUFACTURING]: PRODUCTION_ACCESS_ROLES,
    [MODULE_KEYS.INVENTORY]: INVENTORY_ACCESS_ROLES,
    [MODULE_KEYS.SALES]: SALES_ACCESS_ROLES,
    [MODULE_KEYS.WORK_ORDER]: PRODUCTION_ACCESS_ROLES,
    [MODULE_KEYS.PRODUCTION_JOB]: PRODUCTION_ACCESS_ROLES,
    [MODULE_KEYS.ROUTING]: PRODUCTION_ACCESS_ROLES,
    [MODULE_KEYS.ITEM_CODE_MAPPING]: ITEM_CODE_MAPPING_ACCESS_ROLES,
    [MODULE_KEYS.USER_MANAGEMENT]: USER_MANAGEMENT_ACCESS_ROLES,
};

const ACTION_ROLE_MAP = {
    [ACTION_KEYS.INVENTORY_ITEM_WRITE]: INVENTORY_MANAGE_ROLES,
    [ACTION_KEYS.INVENTORY_APPROVAL_WRITE]: INVENTORY_MANAGE_ROLES,
    [ACTION_KEYS.INVENTORY_PROCUREMENT_WRITE]: INVENTORY_MANAGE_ROLES,
    [ACTION_KEYS.WORK_ORDER_ADMIN_WRITE]: PRODUCTION_MANAGE_ROLES,
    [ACTION_KEYS.ROUTING_LIFECYCLE_WRITE]: PRODUCTION_MANAGE_ROLES,
    [ACTION_KEYS.BOM_STATUS_VERSION_WRITE]: PRODUCTION_MANAGE_ROLES,
    [ACTION_KEYS.ITEM_CODE_MAPPING_WRITE]: ITEM_CODE_MAPPING_MANAGE_ROLES,
};

export const hasRole = (userRoles = [], role) => {
    if (!role || !Array.isArray(userRoles)) {
        return false;
    }
    return userRoles.includes(role);
};

export const hasAnyRole = (userRoles = [], requiredRoles = []) => {
    if (!Array.isArray(userRoles) || !Array.isArray(requiredRoles)) {
        return false;
    }
    return requiredRoles.some((role) => userRoles.includes(role));
};

export const isAdmin = (userRoles = []) => hasAnyRole(userRoles, ADMIN_ROLES);

export const isSuperAdmin = (userRoles = []) => hasRole(userRoles, ROLE_SUPER_ADMIN);

export const canManageAdminRoles = (userRoles = []) => hasRole(userRoles, ROLE_SUPER_ADMIN);

export const canModule = (userRoles = [], moduleKey) => {
    if (!moduleKey) {
        return false;
    }
    return hasAnyRole(userRoles, MODULE_ROLE_MAP[moduleKey] || []);
};

export const canAction = (userRoles = [], actionKey) => {
    if (!actionKey) {
        return false;
    }
    return hasAnyRole(userRoles, ACTION_ROLE_MAP[actionKey] || []);
};

export const canPerformAction = (userRoles = [], actionKey) => canAction(userRoles, actionKey);
