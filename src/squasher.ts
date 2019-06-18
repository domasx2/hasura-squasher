import { promises as fs, constants as fsConstants } from 'fs'
import { exec } from 'shelljs'
import path from 'path'
import { Step, isPermissionStep, MigrationAction, isSQLStep, SQLStep } from './models'
import yaml from 'js-yaml'
import sqlFormatter from 'sql-formatter'

const HASURA_MIGRATIONS_FOLDER = 'migrations'

const MIGRATION_RE = /\d+_.*\.(yaml|sql)$/

export interface SquashOptions {
    starting?: string,
    dry?: boolean,
    name: string,
    dir: string
}

export async function squash(options: SquashOptions) {
    const { projectRoot, migrationsDir } = await resolveDirs(options.dir)
    console.log('Reading migrations...')
    const files = await getSquashableMigrationFiles(projectRoot, migrationsDir, options.starting)
    if (!files.length) {
        return console.log('No new migrations found.')
    }

    const { up: upFiles, down: downFiles } = splitUpAndDown(files)

    console.log(`Found ${upFiles.length} migrations to squash`)

    console.log('Squashing...')
    const process = async (files: string[]) =>
        readMigrations(files)
        .then(deduplicateSteps)
        .then(prettifySQL)
        .then(renderYaml)

    const up = await process(upFiles)
    const down = await process(downFiles)

    if (options.dry) {
        return console.log(`UP:\n\n${up}\n\nDOWN:\n\n${down}\ngood to go!`)
    }

    console.log('Migrating down...')
    migrateDown(projectRoot, upFiles)

    console.log('Deleting existing migrations...')
    deleteFiles([...upFiles, ...downFiles])
    const [version, upfile, downfile] = createMigration(projectRoot, options.name)
    console.log(`Created ${upfile}, ${downfile}`)
    console.log('Writing new migrations...')
    await fs.writeFile(upfile, up)
    await fs.writeFile(downfile, down)
    console.log('Migrating back up')
    migrateUp(projectRoot, version)
    console.log('Exporting metadata...')
    exportMetadata(projectRoot)
    console.log('happy end :-)')
}

function executeShell(cwd: string, cmd: string): [string, string] { // [stdout, stderr]
    const result = exec(cmd, {
        cwd,
        silent: true
    })
    if (result.code === 0) {
        return [result.stdout, result.stderr]
    } else {
        throw new Error(`Failed to execute "${cmd}", sderr: ${result.stderr}`)
    }
}

export async function resolveDirs(dir: string): Promise<{ projectRoot: string, migrationsDir: string }> {
    const projectRoot = path.resolve(dir)
    const migrationsDir = path.join(projectRoot, HASURA_MIGRATIONS_FOLDER)
    try {
        await fs.access(projectRoot, fsConstants.R_OK)
        console.log(`project root: ${projectRoot}`)
    } catch (e) {
        throw new Error(`Project root ${projectRoot} does not exist or not readable`)
    }

    try {
        await fs.access(migrationsDir, fsConstants.W_OK)
        console.log(`migrations root: ${migrationsDir}`)
    } catch (e) {
        throw new Error(`Migrations dir ${projectRoot} does not exist or not readable & writeable`)
    }
    
    return { projectRoot, migrationsDir }
}

export async function getSquashableMigrationFiles(projectDir: string, migrationsDir: string, starting?: string): Promise<string[]> {

    const fileNames: string[] = await (async () => {
        if (starting) {
            const files = (await fs.readdir(migrationsDir)).map(f => path.join(migrationsDir, f))
            const target = files.find(f => path.basename(f).startsWith(starting + '_'))
            if (!target) {
                throw new Error(`Could not not find migration [${starting}]`)
            }
            return files.slice(files.indexOf(target))
        }
        else {
            return executeShell(projectDir, `git ls-files --others --exclude-standard ${migrationsDir}`)[0]
                .split('\n').map(f => path.join(projectDir, f))
        }
    })()

    return fileNames.map(s => s.trim()).filter(s => MIGRATION_RE.test(s)).sort()

}

export function splitUpAndDown(filepaths: string[]) {
    return {
        up: filepaths.filter(f => f.includes('.up.')),
        down: filepaths.filter(f => f.includes('.down.'))
    }
}

export async function readMigrations(files: string[]): Promise<Step[]> {
    return (await Promise.all(files.map(async filepath => {
        const body = await fs.readFile(filepath, { encoding: 'utf-8'})
        if (filepath.endsWith('sql')) {
            const step: SQLStep = {
                args: {
                    sql: body
                },
                type: 'run_sql'
            }
            return [step]
        }
        return yaml.safeLoad(body) as Step[]
    }))).reduce((result, steps) => result.concat(steps), [])
}

export function deduplicateSteps(steps: Step[]): Step[] {

    console.log('dedup', steps)

    // dedupe re-created permissions
    const markedForDelete: number[] = []

    steps.forEach((step, stepIdx) => {
        if (!markedForDelete.includes(stepIdx) && isPermissionStep(step)) {
            const [maction, saction, _] = step.type.split('_')
            if (maction === MigrationAction.create) {

                // if found create permission step, look ahead to find if it's not deleted soon
                // if it is, mark both steps for removal
                for (let i = stepIdx + 1; i < steps.length; i++) {
                    const _step = steps[i]
                    // shot circuit on sql step, might break perms
                    if (isSQLStep(_step)) break;
                    if (isPermissionStep(_step)
                        && _step.type === `${MigrationAction.drop}_${saction}_permission`
                        && _step.args.role === step.args.role
                        && _step.args.table.name === step.args.table.name
                        && _step.args.table.schema === step.args.table.schema) {
                            markedForDelete.push(stepIdx, i)
                            break
                        }
                }
            }
        }
    })
    steps = steps.filter((_, stepIdx) => !markedForDelete.includes(stepIdx))

    // merge adjacent sql steps
    steps = steps.reduce((steps, step) => {
        if (isSQLStep(step) && steps.length) {
            const prev = steps[steps.length -1]
            if (isSQLStep(prev)) {
                prev.args.sql += ' ' + step.args.sql
                return steps
            }
        }
        return [...steps, step]
    }, [] as Step[])

    return steps
}

export function prettifySQL(steps: Step[]): Step[] {
    return steps.map(step => {
        if (isSQLStep(step)) {
            return {
                ...step,
                args: {
                    sql: sqlFormatter.format(step.args.sql)
                }
            }
        }
        return step
    })
}

export function renderYaml(steps: Step[]): string {
    return yaml.safeDump(steps)
}

// this one will be brittle as f, this output is not intended to be parsed..
export function createMigration(projectDir: string, name: string): [string, string, string] { // version, up filename, down filename
    const [_, stderr] = executeShell(projectDir, `hasura migrate create '${name}'`)
    const parts = stderr.split('=')
    const version = parts[parts.length - 1].replace('\n', '')
    return [
        version,
        path.join(projectDir, HASURA_MIGRATIONS_FOLDER, `${version}_${name}.up.yaml`),
        path.join(projectDir, HASURA_MIGRATIONS_FOLDER, `${version}_${name}.down.yaml`),
    ]
}

export function migrateDown(projectDir: string, migrations: string[]) {
    const migrationNumbers = migrations.map(f => path.basename(f).split('_')[0])
    const statusOutput = executeShell(projectDir, 'hasura migrate status')[0]
    const appliedNumbers = statusOutput
        .split('\n')
        .slice(1)
        .map(line => line.split(' ').filter(s => s.trim()))
        .filter(line => line[2] === 'Present')
        .map(line => line[0])

    const toDown = appliedNumbers.reverse().filter(n => migrationNumbers.includes(n))

    for (const migrationNumber of toDown) {
        console.log(`Migrating down ${migrationNumber}...`)
        executeShell(projectDir, `hasura migrate apply --version ${migrationNumber} --type down --skip-execution`)
    }
}

export function migrateUp(projectDir: string, version: string) {
    return executeShell(projectDir, `hasura migrate apply --version ${version} --type up --skip-execution`)
}

export async function deleteFiles(files: string[]) {
    return Promise.all(files.map(file => fs.unlink(file)))
}
export function exportMetadata(projectDir: string) {
    return executeShell(projectDir, 'hasura metadata export')
}