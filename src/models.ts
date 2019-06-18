export interface Step {
    args: unknown
    type: string
}

export type RunSqlType = 'run_sql'

export interface SQLStep extends Step {
    args: {
        sql: string
    },
    type: RunSqlType
}

export function isSQLStep(step: Step): step is SQLStep {
    return step.type === 'run_sql'
}

export enum DropPermissionTypeEnum {
    drop_select_permission,
    drop_update_permission,
    drop_insert_permission,
    drop_delete_permission
}

export enum MigrationAction {
    create = 'create',
    drop = 'drop'
}

export enum SQLAction {
    insert = 'insert',
    update = 'update',
    delete = 'delete',
    select = 'select'
}

export enum CreatePermissionTypeEnum {
    create_select_permission,
    create_update_permission,
    create_insert_permission,
    create_delete_permission
}

export type DropPermissionType = keyof typeof DropPermissionTypeEnum
export type CreatePermissionType = keyof typeof CreatePermissionTypeEnum

export type PermissionType = CreatePermissionType | DropPermissionType

export interface PermissionArgs {
    role: string,
    table: {
        name: string
        schema: string
    } 
}

export interface PermissionStep extends Step {
    args: PermissionArgs,
    type: PermissionType
}

export function isPermissionStep(step: Step): step is PermissionStep {
    return step.type.endsWith('_permission')
}

export function isCreatePermissionStep(step: Step): step is CreatePermissionStep {
    return step.type.startsWith('create_') && step.type.endsWith('_permission')
}

export interface DropPermissionStep extends Step {
    args: PermissionArgs
    type: DropPermissionType
}

export interface CreatePermissionStep extends Step {
    args: PermissionArgs & {
        permission: {
            check: unknown,
            columns: string[],
            localPresets?: Array<{ key: string, value: string}>
            set: { [key: string]: string },
            limit?: unknown,
            filter?: unknown
        }
    },
    type: CreatePermissionType
}