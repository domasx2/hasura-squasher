export interface Step {
    args: unknown;
    type: string;
}
export declare type RunSqlType = 'run_sql';
export interface SQLStep extends Step {
    args: {
        sql: string;
    };
    type: RunSqlType;
}
export declare function isSQLStep(step: Step): step is SQLStep;
export declare enum DropPermissionTypeEnum {
    drop_select_permission = 0,
    drop_update_permission = 1,
    drop_insert_permission = 2,
    drop_delete_permission = 3
}
export declare enum MigrationAction {
    create = "create",
    drop = "drop"
}
export declare enum SQLAction {
    insert = "insert",
    update = "update",
    delete = "delete",
    select = "select"
}
export declare enum CreatePermissionTypeEnum {
    create_select_permission = 0,
    create_update_permission = 1,
    create_insert_permission = 2,
    create_delete_permission = 3
}
export declare type DropPermissionType = keyof typeof DropPermissionTypeEnum;
export declare type CreatePermissionType = keyof typeof CreatePermissionTypeEnum;
export declare type PermissionType = CreatePermissionType | DropPermissionType;
export interface PermissionArgs {
    role: string;
    table: {
        name: string;
        schema: string;
    };
}
export interface PermissionStep extends Step {
    args: PermissionArgs;
    type: PermissionType;
}
export declare function isPermissionStep(step: Step): step is PermissionStep;
export declare function isCreatePermissionStep(step: Step): step is CreatePermissionStep;
export interface DropPermissionStep extends Step {
    args: PermissionArgs;
    type: DropPermissionType;
}
export interface CreatePermissionStep extends Step {
    args: PermissionArgs & {
        permission: {
            check: unknown;
            columns: string[];
            localPresets?: Array<{
                key: string;
                value: string;
            }>;
            set: {
                [key: string]: string;
            };
            limit?: unknown;
            filter?: unknown;
        };
    };
    type: CreatePermissionType;
}
