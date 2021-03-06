Hasura squasher
=====================

CLI tool to squash Hasura (https://hasura.io/) migrations into a single file. Also prettifies SQL, deduplicates permission updates.


# Install

```sh
npm install -g hasura-squasher
```

# Usage

```sh
# assuming cwd is a hasura project, squash uncommited migrations to a migration named "bar_table"
hasura-squasher --name bar_table

# squash to first existing migration file
hasura-squasher --name replace

# squash starting with specific migration
hasura-squasher --starting 1558366677954

# explicitly specify hasura project dir
hasura-squasher --name bar_table --dir ~/my-hasura-project

# print out resulting migration w/o making any changes
hasura-squasher --name bar_table --dry

# export metadata.json to migrations dir when finished
hasura-squasher --name replace --export-metadata

# print help
hasura-squasher --help
```
