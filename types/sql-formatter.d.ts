declare module 'sql-formatter' {

    interface SqlFormatter {
        format(sql: string): string
    }

    const formatter: SqlFormatter

    export default formatter
}