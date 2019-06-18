"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var shelljs_1 = require("shelljs");
var path_1 = __importDefault(require("path"));
var models_1 = require("./models");
var js_yaml_1 = __importDefault(require("js-yaml"));
var sql_formatter_1 = __importDefault(require("sql-formatter"));
var HASURA_MIGRATIONS_FOLDER = 'migrations';
var MIGRATION_RE = /\d+_.*\.(yaml|sql)$/;
function squash(options) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, projectRoot, migrationsDir, files, _b, upFiles, downFiles, process, up, down, _c, version, upfile, downfile;
        var _this = this;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, resolveDirs(options.dir)];
                case 1:
                    _a = _d.sent(), projectRoot = _a.projectRoot, migrationsDir = _a.migrationsDir;
                    console.log('Reading migrations...');
                    return [4 /*yield*/, getSquashableMigrationFiles(projectRoot, migrationsDir, options.starting)];
                case 2:
                    files = _d.sent();
                    if (!files.length) {
                        return [2 /*return*/, console.log('No new migrations found.')];
                    }
                    _b = splitUpAndDown(files), upFiles = _b.up, downFiles = _b.down;
                    console.log("Found " + upFiles.length + " migrations to squash");
                    console.log('Squashing...');
                    process = function (files, down) { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, readMigrations(files, down)
                                    .then(deduplicateSteps)
                                    .then(prunePermissions)
                                    .then(prettifySQL)
                                    .then(renderYaml)];
                        });
                    }); };
                    return [4 /*yield*/, process(upFiles)];
                case 3:
                    up = _d.sent();
                    return [4 /*yield*/, process(downFiles, true)];
                case 4:
                    down = _d.sent();
                    if (options.dry) {
                        return [2 /*return*/, console.log("UP:\n\n" + up + "\n\nDOWN:\n\n" + down + "\ngood to go!")];
                    }
                    console.log('Migrating down...');
                    migrateDown(projectRoot, upFiles);
                    console.log('Deleting existing migrations...');
                    deleteFiles(upFiles.concat(downFiles));
                    _c = createMigration(projectRoot, options.name), version = _c[0], upfile = _c[1], downfile = _c[2];
                    console.log("Created " + upfile + ", " + downfile);
                    console.log('Writing new migrations...');
                    return [4 /*yield*/, fs_1.promises.writeFile(upfile, up)];
                case 5:
                    _d.sent();
                    return [4 /*yield*/, fs_1.promises.writeFile(downfile, down)];
                case 6:
                    _d.sent();
                    console.log('Migrating back up');
                    migrateUp(projectRoot, version);
                    console.log('Exporting metadata...');
                    exportMetadata(projectRoot);
                    console.log('happy end :-)');
                    return [2 /*return*/];
            }
        });
    });
}
exports.squash = squash;
function executeShell(cwd, cmd) {
    var result = shelljs_1.exec(cmd, {
        cwd: cwd,
        silent: true
    });
    if (result.code === 0) {
        return [result.stdout, result.stderr];
    }
    else {
        throw new Error("Failed to execute \"" + cmd + "\", sderr: " + result.stderr);
    }
}
function resolveDirs(dir) {
    return __awaiter(this, void 0, void 0, function () {
        var projectRoot, migrationsDir, e_1, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    projectRoot = path_1.default.resolve(dir);
                    migrationsDir = path_1.default.join(projectRoot, HASURA_MIGRATIONS_FOLDER);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fs_1.promises.access(projectRoot, fs_1.constants.R_OK)];
                case 2:
                    _a.sent();
                    console.log("project root: " + projectRoot);
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    throw new Error("Project root " + projectRoot + " does not exist or not readable");
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, fs_1.promises.access(migrationsDir, fs_1.constants.W_OK)];
                case 5:
                    _a.sent();
                    console.log("migrations root: " + migrationsDir);
                    return [3 /*break*/, 7];
                case 6:
                    e_2 = _a.sent();
                    throw new Error("Migrations dir " + projectRoot + " does not exist or not readable & writeable");
                case 7: return [2 /*return*/, { projectRoot: projectRoot, migrationsDir: migrationsDir }];
            }
        });
    });
}
exports.resolveDirs = resolveDirs;
function getSquashableMigrationFiles(projectDir, migrationsDir, starting) {
    return __awaiter(this, void 0, void 0, function () {
        var fileNames;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (function () { return __awaiter(_this, void 0, void 0, function () {
                        var files, target;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (!starting) return [3 /*break*/, 2];
                                    return [4 /*yield*/, fs_1.promises.readdir(migrationsDir)];
                                case 1:
                                    files = (_a.sent()).map(function (f) { return path_1.default.join(migrationsDir, f); });
                                    target = files.find(function (f) { return path_1.default.basename(f).startsWith(starting + '_'); });
                                    if (!target) {
                                        throw new Error("Could not not find migration [" + starting + "]");
                                    }
                                    return [2 /*return*/, files.slice(files.indexOf(target))];
                                case 2: return [2 /*return*/, executeShell(projectDir, "git ls-files --others --exclude-standard " + migrationsDir)[0]
                                        .split('\n').map(function (f) { return path_1.default.join(projectDir, f); })];
                            }
                        });
                    }); })()];
                case 1:
                    fileNames = _a.sent();
                    return [2 /*return*/, fileNames.map(function (s) { return s.trim(); }).filter(function (s) { return MIGRATION_RE.test(s); }).sort()];
            }
        });
    });
}
exports.getSquashableMigrationFiles = getSquashableMigrationFiles;
function splitUpAndDown(filepaths) {
    return {
        up: filepaths.filter(function (f) { return f.includes('.up.'); }),
        down: filepaths.filter(function (f) { return f.includes('.down.'); })
    };
}
exports.splitUpAndDown = splitUpAndDown;
function readMigrations(files, down) {
    return __awaiter(this, void 0, void 0, function () {
        var steps;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.all(files.map(function (filepath) { return __awaiter(_this, void 0, void 0, function () {
                        var body, step;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, fs_1.promises.readFile(filepath, { encoding: 'utf-8' })];
                                case 1:
                                    body = _a.sent();
                                    if (filepath.endsWith('sql')) {
                                        step = {
                                            args: {
                                                sql: body
                                            },
                                            type: 'run_sql'
                                        };
                                        return [2 /*return*/, [step]];
                                    }
                                    return [2 /*return*/, js_yaml_1.default.safeLoad(body)];
                            }
                        });
                    }); }))];
                case 1:
                    steps = (_a.sent());
                    if (down) {
                        steps = steps.reverse();
                    }
                    return [2 /*return*/, steps.reduce(function (result, steps) { return result.concat(steps); }, [])];
            }
        });
    });
}
exports.readMigrations = readMigrations;
function deduplicateSteps(steps) {
    // dedupe re-created permissions
    var markedForDelete = [];
    steps.forEach(function (step, stepIdx) {
        if (!markedForDelete.includes(stepIdx) && models_1.isPermissionStep(step)) {
            var _a = step.type.split('_'), maction = _a[0], saction = _a[1], _ = _a[2];
            if (maction === models_1.MigrationAction.create) {
                // if found create permission step, look ahead to find if it's not deleted soon
                // if it is, mark both steps for removal
                for (var i = stepIdx + 1; i < steps.length; i++) {
                    var _step = steps[i];
                    // shot circuit on sql step, might break perms
                    if (models_1.isSQLStep(_step))
                        break;
                    if (models_1.isPermissionStep(_step)
                        && _step.type === models_1.MigrationAction.drop + "_" + saction + "_permission"
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
    steps = steps.filter(function (_, stepIdx) { return !markedForDelete.includes(stepIdx); });
    // merge adjacent sql steps
    steps = steps.reduce(function (steps, step) {
        if (models_1.isSQLStep(step) && steps.length) {
            var prev = steps[steps.length - 1];
            if (models_1.isSQLStep(prev)) {
                prev.args.sql += ' ' + step.args.sql;
                return steps;
            }
        }
        return steps.concat([step]);
    }, []);
    return steps;
}
exports.deduplicateSteps = deduplicateSteps;
function prettifySQL(steps) {
    return steps.map(function (step) {
        if (models_1.isSQLStep(step)) {
            return __assign({}, step, { args: {
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
    var _a = executeShell(projectDir, "hasura migrate create '" + name + "'"), _ = _a[0], stderr = _a[1];
    var parts = stderr.split('=');
    var version = parts[parts.length - 1].replace('\n', '');
    return [
        version,
        path_1.default.join(projectDir, HASURA_MIGRATIONS_FOLDER, version + "_" + name + ".up.yaml"),
        path_1.default.join(projectDir, HASURA_MIGRATIONS_FOLDER, version + "_" + name + ".down.yaml"),
    ];
}
exports.createMigration = createMigration;
function migrateDown(projectDir, migrations) {
    var migrationNumbers = migrations.map(function (f) { return path_1.default.basename(f).split('_')[0]; });
    var statusOutput = executeShell(projectDir, 'hasura migrate status')[0];
    var appliedNumbers = statusOutput
        .split('\n')
        .slice(1)
        .map(function (line) { return line.split(' ').filter(function (s) { return s.trim(); }); })
        .filter(function (line) { return line[2] === 'Present'; })
        .map(function (line) { return line[0]; });
    var toDown = appliedNumbers.reverse().filter(function (n) { return migrationNumbers.includes(n); });
    for (var _i = 0, toDown_1 = toDown; _i < toDown_1.length; _i++) {
        var migrationNumber = toDown_1[_i];
        console.log("Migrating down " + migrationNumber + "...");
        executeShell(projectDir, "hasura migrate apply --version " + migrationNumber + " --type down --skip-execution");
    }
}
exports.migrateDown = migrateDown;
function migrateUp(projectDir, version) {
    return executeShell(projectDir, "hasura migrate apply --version " + version + " --type up --skip-execution");
}
exports.migrateUp = migrateUp;
function deleteFiles(files) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, Promise.all(files.map(function (file) { return fs_1.promises.unlink(file); }))];
        });
    });
}
exports.deleteFiles = deleteFiles;
function exportMetadata(projectDir) {
    return executeShell(projectDir, 'hasura metadata export');
}
exports.exportMetadata = exportMetadata;
function prunePermissions(steps) {
    return steps.map(function (step) {
        console.log('p', step);
        if (models_1.isCreatePermissionStep(step) && step.args.permission.localPresets) {
            console.log('prune', step);
            var newStep = __assign({}, step, { args: __assign({}, step.args, { permission: __assign({}, step.args.permission, { localPresets: step.args.permission.localPresets.filter(function (p) { return p.key || p.value; }) }) }) });
            return newStep;
        }
        return step;
    });
}
exports.prunePermissions = prunePermissions;
