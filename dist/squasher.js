"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const shelljs_1 = require("shelljs");
const path_1 = __importDefault(require("path"));
const models_1 = require("./models");
const js_yaml_1 = __importDefault(require("js-yaml"));
const sql_formatter_1 = __importDefault(require("sql-formatter"));
const HASURA_MIGRATIONS_FOLDER = 'migrations';
const MIGRATION_RE = /\d+_.*\.(yaml|sql)$/;
function squash(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const { projectRoot, migrationsDir } = yield resolveDirs(options.dir);
        console.log('Reading migrations...');
        const files = yield getSquashableMigrationFiles(projectRoot, migrationsDir, options.starting);
        if (!files.length) {
            return console.log('No new migrations found.');
        }
        const { up: upFiles, down: downFiles } = splitUpAndDown(files);
        console.log(`Found ${upFiles.length} migrations to squash`);
        console.log('Squashing...');
        const process = (files, down) => __awaiter(this, void 0, void 0, function* () {
            return readMigrations(files, down)
                .then(deduplicateSteps)
                .then(prunePermissions)
                .then(prettifySQL)
                .then(renderYaml);
        });
        const up = yield process(upFiles);
        const down = yield process(downFiles, true);
        if (options.dry) {
            return console.log(`UP:\n\n${up}\n\nDOWN:\n\n${down}\ngood to go!`);
        }
        console.log('Migrating down...');
        migrateDown(projectRoot, upFiles);
        console.log('Deleting existing migrations...');
        deleteFiles([...upFiles, ...downFiles]);
        const [version, upfile, downfile] = createMigration(projectRoot, options.name);
        console.log(`Created ${upfile}, ${downfile}`);
        console.log('Writing new migrations...');
        yield fs_1.promises.writeFile(upfile, up);
        yield fs_1.promises.writeFile(downfile, down);
        console.log('Migrating back up');
        migrateUp(projectRoot, version);
        console.log('Exporting metadata...');
        exportMetadata(projectRoot);
        console.log('happy end :-)');
    });
}
exports.squash = squash;
function executeShell(cwd, cmd) {
    const result = shelljs_1.exec(cmd, {
        cwd,
        silent: true
    });
    if (result.code === 0) {
        return [result.stdout, result.stderr];
    }
    else {
        throw new Error(`Failed to execute "${cmd}", sderr: ${result.stderr}`);
    }
}
function resolveDirs(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        const projectRoot = path_1.default.resolve(dir);
        const migrationsDir = path_1.default.join(projectRoot, HASURA_MIGRATIONS_FOLDER);
        try {
            yield fs_1.promises.access(projectRoot, fs_1.constants.R_OK);
            console.log(`project root: ${projectRoot}`);
        }
        catch (e) {
            throw new Error(`Project root ${projectRoot} does not exist or not readable`);
        }
        try {
            yield fs_1.promises.access(migrationsDir, fs_1.constants.W_OK);
            console.log(`migrations root: ${migrationsDir}`);
        }
        catch (e) {
            throw new Error(`Migrations dir ${projectRoot} does not exist or not readable & writeable`);
        }
        return { projectRoot, migrationsDir };
    });
}
exports.resolveDirs = resolveDirs;
function getSquashableMigrationFiles(projectDir, migrationsDir, starting) {
    return __awaiter(this, void 0, void 0, function* () {
        const fileNames = yield (() => __awaiter(this, void 0, void 0, function* () {
            if (starting) {
                const files = (yield fs_1.promises.readdir(migrationsDir)).map(f => path_1.default.join(migrationsDir, f));
                const target = files.find(f => path_1.default.basename(f).startsWith(starting + '_'));
                if (!target) {
                    throw new Error(`Could not not find migration [${starting}]`);
                }
                return files.slice(files.indexOf(target));
            }
            else {
                return executeShell(projectDir, `git ls-files --others --exclude-standard ${migrationsDir}`)[0]
                    .split('\n').map(f => path_1.default.join(projectDir, f));
            }
        }))();
        return fileNames.map(s => s.trim()).filter(s => MIGRATION_RE.test(s)).sort();
    });
}
exports.getSquashableMigrationFiles = getSquashableMigrationFiles;
function splitUpAndDown(filepaths) {
    return {
        up: filepaths.filter(f => f.includes('.up.')),
        down: filepaths.filter(f => f.includes('.down.'))
    };
}
exports.splitUpAndDown = splitUpAndDown;
function readMigrations(files, down) {
    return __awaiter(this, void 0, void 0, function* () {
        let steps = (yield Promise.all(files.map((filepath) => __awaiter(this, void 0, void 0, function* () {
            const body = yield fs_1.promises.readFile(filepath, { encoding: 'utf-8' });
            if (filepath.endsWith('sql')) {
                const step = {
                    args: {
                        sql: body
                    },
                    type: 'run_sql'
                };
                return [step];
            }
            return js_yaml_1.default.safeLoad(body);
        }))));
        if (down) {
            steps = steps.reverse();
        }
        return steps.reduce((result, steps) => result.concat(steps), []);
    });
}
exports.readMigrations = readMigrations;
function deduplicateSteps(steps) {
    // dedupe re-created permissions
    const markedForDelete = [];
    steps.forEach((step, stepIdx) => {
        if (!markedForDelete.includes(stepIdx) && models_1.isPermissionStep(step)) {
            const [maction, saction, _] = step.type.split('_');
            if (maction === models_1.MigrationAction.create) {
                // if found create permission step, look ahead to find if it's not deleted soon
                // if it is, mark both steps for removal
                for (let i = stepIdx + 1; i < steps.length; i++) {
                    const _step = steps[i];
                    // shot circuit on sql step, might break perms
                    if (models_1.isSQLStep(_step))
                        break;
                    if (models_1.isPermissionStep(_step)
                        && _step.type === `${models_1.MigrationAction.drop}_${saction}_permission`
                        && _step.args.role === step.args.role
                        && _step.args.table.name === step.args.table.name
                        && _step.args.table.schema === step.args.table.schema) {
                        markedForDelete.push(stepIdx, i);
                        break;
                    }
                }
            }
        }
    });
    steps = steps.filter((_, stepIdx) => !markedForDelete.includes(stepIdx));
    // merge adjacent sql steps
    steps = steps.reduce((steps, step) => {
        if (models_1.isSQLStep(step) && steps.length) {
            const prev = steps[steps.length - 1];
            if (models_1.isSQLStep(prev)) {
                prev.args.sql += ' ' + step.args.sql;
                return steps;
            }
        }
        return [...steps, step];
    }, []);
    return steps;
}
exports.deduplicateSteps = deduplicateSteps;
function prettifySQL(steps) {
    return steps.map(step => {
        if (models_1.isSQLStep(step)) {
            return Object.assign({}, step, { args: {
                    sql: sql_formatter_1.default.format(step.args.sql)
                } });
        }
        return step;
    });
}
exports.prettifySQL = prettifySQL;
function renderYaml(steps) {
    return js_yaml_1.default.safeDump(steps);
}
exports.renderYaml = renderYaml;
// this one will be brittle as f, this output is not intended to be parsed..
function createMigration(projectDir, name) {
    const [_, stderr] = executeShell(projectDir, `hasura migrate create '${name}'`);
    const parts = stderr.split('=');
    const version = parts[parts.length - 1].replace('\n', '');
    return [
        version,
        path_1.default.join(projectDir, HASURA_MIGRATIONS_FOLDER, `${version}_${name}.up.yaml`),
        path_1.default.join(projectDir, HASURA_MIGRATIONS_FOLDER, `${version}_${name}.down.yaml`),
    ];
}
exports.createMigration = createMigration;
function migrateDown(projectDir, migrations) {
    const migrationNumbers = migrations.map(f => path_1.default.basename(f).split('_')[0]);
    const statusOutput = executeShell(projectDir, 'hasura migrate status')[0];
    const appliedNumbers = statusOutput
        .split('\n')
        .slice(1)
        .map(line => line.split(' ').filter(s => s.trim()))
        .filter(line => line[2] === 'Present')
        .map(line => line[0]);
    const toDown = appliedNumbers.reverse().filter(n => migrationNumbers.includes(n));
    for (const migrationNumber of toDown) {
        console.log(`Migrating down ${migrationNumber}...`);
        executeShell(projectDir, `hasura migrate apply --version ${migrationNumber} --type down --skip-execution`);
    }
}
exports.migrateDown = migrateDown;
function migrateUp(projectDir, version) {
    return executeShell(projectDir, `hasura migrate apply --version ${version} --type up --skip-execution`);
}
exports.migrateUp = migrateUp;
function deleteFiles(files) {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.all(files.map(file => fs_1.promises.unlink(file)));
    });
}
exports.deleteFiles = deleteFiles;
function exportMetadata(projectDir) {
    return executeShell(projectDir, 'hasura metadata export');
}
exports.exportMetadata = exportMetadata;
function prunePermissions(steps) {
    return steps.map(step => {
        if (models_1.isCreatePermissionStep(step) && step.args.permission.localPresets) {
            const newStep = Object.assign({}, step, { args: Object.assign({}, step.args, { permission: Object.assign({}, step.args.permission, { localPresets: step.args.permission.localPresets.filter(p => p.key || p.value) }) }) });
            return newStep;
        }
        return step;
    });
}
exports.prunePermissions = prunePermissions;
