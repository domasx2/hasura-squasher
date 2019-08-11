import yargs from 'yargs'
import { squash, SquashOptions } from './squasher';


function exit(error: string) {
    console.error(`ERROR: ${error}`)
    process.exit(1)
}

export function runCmd() {

    var argv: SquashOptions = yargs
        .usage('usage: $0 [options]')
        .string('starting')
        .describe('starting', 'int, migration version. squash migrations starting with this one')
        .boolean('dry')
        .describe('dry', 'dry run, print out migrations w/o applying')
        .string('name')
        .describe('name', 'name of the aggregate migration. Or "replace" to squash to first migration')
        .string('dir')
        .describe('dir', 'hasura project directory')
        .default('dir', './')
        .demandOption('name')
        .boolean('export-metadata')
        .describe('export-metadata', 'export metadata when finished')
        .default('export-metadata', false)
        .help()
        .argv

    if (argv.starting && isNaN(parseInt(argv.starting, 10))) {
        return exit("argument for [starting] must be a number")
    }

    squash(argv)
    .then(() => {
        console.log('Squash done!')
        process.exit(0)
    })
    .catch((e: Error) => {
        exit(e.message)
    })
}