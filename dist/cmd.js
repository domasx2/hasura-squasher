"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const squasher_1 = require("./squasher");
function exit(error) {
    console.error(`ERROR: ${error}`);
    process.exit(1);
}
function runCmd() {
    var argv = yargs_1.default
        .usage('usage: $0 [options]')
        .string('starting')
        .describe('starting', 'int, migration version. squash migrations starting with this one')
        .boolean('dry')
        .describe('dry', 'dry run, print out migrations w/o applying')
        .string('name')
        .describe('name', 'name of the aggregate migration')
        .string('dir')
        .describe('dir', 'hasura project directory')
        .default('dir', './')
        .demandOption('name')
        .help()
        .argv;
    if (argv.starting && isNaN(parseInt(argv.starting, 10))) {
        return exit("argument for [starting] must be a number");
    }
    squasher_1.squash(argv)
        .then(() => {
        console.log('Squash done!');
        process.exit(0);
    })
        .catch((e) => {
        exit(e.message);
    });
}
exports.runCmd = runCmd;
