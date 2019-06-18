"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function isSQLStep(step) {
    return step.type === 'run_sql';
}
exports.isSQLStep = isSQLStep;
var DropPermissionTypeEnum;
(function (DropPermissionTypeEnum) {
    DropPermissionTypeEnum[DropPermissionTypeEnum["drop_select_permission"] = 0] = "drop_select_permission";
    DropPermissionTypeEnum[DropPermissionTypeEnum["drop_update_permission"] = 1] = "drop_update_permission";
    DropPermissionTypeEnum[DropPermissionTypeEnum["drop_insert_permission"] = 2] = "drop_insert_permission";
    DropPermissionTypeEnum[DropPermissionTypeEnum["drop_delete_permission"] = 3] = "drop_delete_permission";
})(DropPermissionTypeEnum = exports.DropPermissionTypeEnum || (exports.DropPermissionTypeEnum = {}));
var MigrationAction;
(function (MigrationAction) {
    MigrationAction["create"] = "create";
    MigrationAction["drop"] = "drop";
})(MigrationAction = exports.MigrationAction || (exports.MigrationAction = {}));
var SQLAction;
(function (SQLAction) {
    SQLAction["insert"] = "insert";
    SQLAction["update"] = "update";
    SQLAction["delete"] = "delete";
    SQLAction["select"] = "select";
})(SQLAction = exports.SQLAction || (exports.SQLAction = {}));
var CreatePermissionTypeEnum;
(function (CreatePermissionTypeEnum) {
    CreatePermissionTypeEnum[CreatePermissionTypeEnum["create_select_permission"] = 0] = "create_select_permission";
    CreatePermissionTypeEnum[CreatePermissionTypeEnum["create_update_permission"] = 1] = "create_update_permission";
    CreatePermissionTypeEnum[CreatePermissionTypeEnum["create_insert_permission"] = 2] = "create_insert_permission";
    CreatePermissionTypeEnum[CreatePermissionTypeEnum["create_delete_permission"] = 3] = "create_delete_permission";
})(CreatePermissionTypeEnum = exports.CreatePermissionTypeEnum || (exports.CreatePermissionTypeEnum = {}));
function isPermissionStep(step) {
    return step.type.endsWith('_permission');
}
exports.isPermissionStep = isPermissionStep;
