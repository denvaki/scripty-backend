const pgtools = require("pgtools");
const {distros} = require('../config.json')
const EventEmitter = require('events');
const repoMap = require('../repositoriesMap.json');
const DBConnect = require('./DBConnect.js');
const dbConfig = require('./dbConfig.json');

function initDataBases() {
    const dataBaseCreation = new EventEmitter();
    dbConfig.database = dbConfig.user;
    repoMap.forEach(distroObj => {
            pgtools.createdb(dbConfig, distroObj.distro, function (err, res) {
                if (err) {
                    console.error(err);
                    if (err.name !== "duplicate_database") process.exit(-1);
                }
                console.log(res);
                dataBaseCreation.emit('created', distroObj)
            });
        }
    );

    return dataBaseCreation;
}

function createTables(distroObj) {
    const database = distroObj.distro;
    let dbConnect = new DBConnect(database);
    const releases = distroObj.releaseNames.map(releaseName => releaseName.release);
    releases.forEach(release => {
        const createTableQuery =
            `
            drop table if exists ${release};
            CREATE TABLE IF NOT EXISTS ${release} (
                ID SERIAL PRIMARY KEY,
                Package varchar NOT NULL,
                Version varchar NOT NULL,
                Installed_Size int,
                Maintainer varchar NOT NULL,
                Architecture varchar NOT NULL,
                Depends varchar,
                Description varchar NOT NULL,
                Homepage varchar,
                Section varchar NOT NULL,
                Sub_Section varchar,
                Filename varchar,
                Size integer,
                Conflicts varchar
                );
                
                create or replace function getRowsByPackageName_${release}(
                    package_names TEXT ARRAY,
                    arch varchar default '%'
                )
                
                returns table (res_package varchar, res_version varchar, res_installed_size int, res_maintainer varchar, res_architecture varchar, res_depends varchar, res_description varchar, 
                        res_homepage varchar, res_section varchar, res_sub_section varchar, res_filename varchar, res_size integer, res_conflicts varchar)
                AS $$
                BEGIN
                    return query
                    SELECT package, version, installed_size, maintainer, architecture, depends, description, 
                        homepage, section, sub_section, filename, size, conflicts 
                            FROM ${release} WHERE package = ANY(package_names) AND architecture like arch;
                END;$$
                language plpgsql;
                ;
                


                create or replace function isPackageExist_${release}(
                    package_name TEXT,
                    arch TEXT
                )
                
                returns boolean 
                AS $$
                declare
                 counter integer;
                BEGIN
                    counter := 	count(*) from ${release} where package = package_name and architecture = arch;
                    if (counter > 0) then return (TRUE);
                    else return (FALSE);
                    end if;
                END;$$
                language plpgsql;
                ;

                `;
        dbConnect.query(createTableQuery, (err, res) => {
            console.log(err, res)
        });

    });

    if(distroObj.latestRelease && distroObj.latestRelease.release){

        let query = `
            DROP TABLE IF EXISTS contents;
            CREATE TABLE IF NOT EXISTS contents(
                ID SERIAL PRIMARY KEY,
                filename VARCHAR NOT NULL,
                package VARCHAR NOT NULL,
                section VARCHAR
            );
        `;

        dbConnect.query(query, (err, res) => {
            console.log(err, res)
        });

    }
}

function deleteTable(all, tableNameArr) {
    const dataBaseDeletion = new EventEmitter();
    if (all === undefined || typeof all !== "boolean") return {error: "first argument is not specified"};
    if (all === false && (tableNameArr === undefined || !Array.isArray(tableNameArr) || tableNameArr.length === 0)) return {error: "table name array is not specified or empty"};
    const dropAllTablesQuery =
        `DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;`;
    if (all) {
        db.query(dropAllTablesQuery, [], (err, res) => {
            if (err) {
                console.log(err);
            } else console.log('deleted all tables');
            db.close()
            dataBaseDeletion.emit('finished');
        });
    } else {
        const dropSpecificTablesQuery = `DROP TABLE ${tableNameArr.join(',')};`
        db.query(dropSpecificTablesQuery, [], (err, res) => {
            if (err) {
                console.log(err);
            } else console.log(`deleted ${tableNameArr.toString()} tables`);
            db.close()
            dataBaseDeletion.emit('finished');

        })
    }
    return dataBaseDeletion;
}

initDataBases().on('created', arg => createTables(arg));

//deleteTable(false, ["debian", "ubuntu"]).on('finished', createTables)





