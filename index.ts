
import { Client, ClientConfig, QueryResult, QueryResultRow } from 'pg';
import  config from './config';
import  { DATABASES} from './types';
import assert from 'assert'
import * as fs from "fs";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function runQuery<R extends QueryResultRow>(query: string, config: ClientConfig): Promise<QueryResult<R>> {
    const client = new Client({
        ...config,
        ssl: true
      });

      await client.connect();
      const res = await client.query(query);
      await client.end();
     return res;
}

const zip  = <T,V>(array1:T[], array2:V[], fn: (a:T, b:V) => void ) =>  
    array1
    .map((value, index):[v1:T, v2:V]  => [value, array2[index]] )
    .forEach( ([v1, v2])=> fn(v1,v2))

type PairDatabasesQuery = (query:string) => Promise<[QueryResult<QueryResultRow>, QueryResult<QueryResultRow>]>

const  runQueryAgainstDatabases = (sourceDatabse: ClientConfig, targetDatase: ClientConfig): PairDatabasesQuery => async (query: string): Promise<[QueryResult<QueryResultRow>, QueryResult<QueryResultRow>]> => {
    const source = await runQuery(query, sourceDatabse)
    const target = await runQuery(query, targetDatase)
    return [source, target]
}

const verifyTablesSchemas = async (databaseQuery: PairDatabasesQuery) => {


    console.log("-----Verifing Schema----")
    const [source, target] = await databaseQuery(`
        SELECT tb.* FROM information_schema.tables tb
        join information_schema."columns" c on  tb.table_name = c.table_name
        where tb.table_schema = 'public' and tb.table_type <> 'FOREIGN'
        ORDER BY tb.table_name, c.column_name
    `);
    
    assert(source.rowCount === target.rowCount, "Tables do not match do not match")

    zip(source.rows, target.rows, (sourceRows, targetRows) => {
            Object.keys(sourceRows)
        .filter(key=> ![`table_catalog`, `udt_catalog`, `ordinal_position`].includes(key))
        .forEach( key=>   assert(
                 targetRows[key] == sourceRows[key], 
                 `Schema do not match ${targetRows["table_name"]}.${key} with values  ${sourceRows[key]} !=  ${targetRows[key]}`
            )
            
        )
    })


    
    console.log(`Tables are sync with ${source.rowCount} matches`)
}


const verifyData = async (databaseQuery: PairDatabasesQuery) => {
     console.log("--------------------VERIFYING DATA ------------------------------------")
    const [tablesQueryResult, _] = await databaseQuery(`
        SELECT tb.table_name FROM information_schema.tables tb
        where tb.table_schema = 'public'  and tb.table_type <> 'FOREIGN'
     `);


    const tables = tablesQueryResult.rows.map(row => row["table_name"])


    const tablesNotSync:any[] = []
    let c=0;
    for await(const table  of  tables) {
        try {
            console.log(`query table ${table}`)
            const [source, target]= await databaseQuery(`
                SELECT count(*)
                FROM ${table}
            `);

        

            if(source.rows[0].count !=  target.rows[0].count) {
                console.log( `${++c}  ${table}: ${Math.abs(source.rows[0].count - target.rows[0].count) }`)
                tablesNotSync.push({ table, source:source.rows[0].count, target: target.rows[0].count , difference: Math.abs(source.rows[0].count - target.rows[0].count) })
            }
            
        } catch (error) {
            console.error(`${table} ${error}`)
        }

    }
    
    return tablesNotSync;

    //assert(tablesNotSync.length === 0, `Check migration data ${ JSON.stringify({ tablesNotSync }, null, 2) }`)
}

(async() => {

    // const masterDatabasesQuery: PairDatabasesQuery = runQueryAgainstDatabases(config.MASTER_LEGACY, config.HEROKU_MASTER)
   
    // await 
    //     verifyTablesSchemas(masterDatabasesQuery)   .catch(console.error)
    // await    verifyData(masterDatabasesQuery)
    //     .then(data => fs.writeFileSync("./master-data-sync", JSON.stringify(data, null, 2)))
    //     .catch(console.error)


   const personalDatabasesQuery: PairDatabasesQuery = runQueryAgainstDatabases(config.PERSONAL_LEGACY, config.HEROKU_PERSONAL)
   
    await   verifyTablesSchemas(personalDatabasesQuery)   .catch(console.error)
    await        verifyData(personalDatabasesQuery)
            .then(data => fs.writeFileSync("./personal-data-sync", JSON.stringify(data, null, 2)))
            .catch(console.error)

console.log("finish")
 
//     var query = ` SELECT
//             tc.table_name, 
//             tc.constraint_name, 
//             tc.table_name, 
//             kcu.column_name, 
//             ccu.table_schema AS foreign_table_schema,
//             ccu.table_name AS foreign_table_name,
//             ccu.column_name AS foreign_column_name
//         FROM 
//             information_schema.table_constraints AS tc 
//             JOIN information_schema.key_column_usage AS kcu
//             ON tc.constraint_name = kcu.constraint_name
//             AND tc.table_schema = kcu.table_schema
//             JOIN information_schema.constraint_column_usage AS ccu
//             ON ccu.constraint_name = tc.constraint_name
//             AND ccu.table_schema = tc.table_schema
//         WHERE tc.constraint_type = 'FOREIGN KEY'
// `

//     await runQuery(query, config.HEROKU_PERSONAL)
//         .then( ({ rows }) =>  {

//          //   fs.writeFileSync('./foreignKey.json', JSON.stringify(rows, null,2))
//             const dropForeignKeyQuery = (table:string, foreign_key_name:string) => `ALTER TABLE ${table} DROP CONSTRAINT ${foreign_key_name};`; 
//             const addForeignKeyQuery = (table:string, foreign_key_name:string,  column_name: string ,foreign_table_name:string, foreign_column_name: string) => 
//                 `ALTER TABLE ${table} 
//                   ADD CONSTRAINT ${foreign_key_name} FOREIGN KEY (${column_name}) REFERENCES ${foreign_table_name} (${foreign_column_name});`; 
            
                
//              const alterForeignKeyQuery = rows
//                 //.map ((row) => dropForeignKeyQuery(row.table_name, row.constraint_name))
//                 .map ((row) => addForeignKeyQuery(row.table_name, row.constraint_name, row.column_name, row.foreign_table_name, row.foreign_column_name))
//                 .join("\n")
            
//                 console.log(alterForeignKeyQuery)
//              return runQuery(alterForeignKeyQuery, config.HEROKU_PERSONAL);
//       }).catch(console.error)
})()
