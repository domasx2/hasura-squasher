import { Step } from './models';
export interface SquashOptions {
    starting?: string;
    dry?: boolean;
    name: string;
    dir: string;
}
export declare function squash(options: SquashOptions): Promise<void>;
export declare function resolveDirs(dir: string): Promise<{
    projectRoot: string;
    migrationsDir: string;
}>;
export declare function getSquashableMigrationFiles(projectDir: string, migrationsDir: string, starting?: string): Promise<string[]>;
export declare function splitUpAndDown(filepaths: string[]): {
    up: string[];
    down: string[];
};
export declare function readMigrations(files: string[]): Promise<Step[]>;
export declare function deduplicateSteps(steps: Step[]): Step[];
export declare function prettifySQL(steps: Step[]): Step[];
export declare function renderYaml(steps: Step[]): string;
export declare function createMigration(projectDir: string, name: string): [string, string, string];
export declare function migrateDown(projectDir: string, migrations: string[]): void;
export declare function migrateUp(projectDir: string, version: string): [string, string];
export declare function deleteFiles(files: string[]): Promise<void[]>;
export declare function exportMetadata(projectDir: string): [string, string];
