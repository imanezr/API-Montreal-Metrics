const sqlite3 = require('sqlite3').verbose();



class Database {
    constructor(name) {
        this.name = name;
        this.db = null;
        this.works = false;
        this.in_recovery = false;
        this.unsaved_data = [];
    }

    start_db() {
        let instance = this;
        return new Promise( (resolve, reject) => {
            instance.db = new sqlite3.Database('./src/db/'+instance.name+'.db', (err) => {
                if(err) {
                    reject(err);
                }
                console.log("Connected to "+instance.name+" database!")
                instance.verify_tables()
                .then(() => {resolve();})
                .catch((err) => reject(err));
            });
        })
    }

    create_table(command) {
        let instance = this;
        return new Promise( (resolve, reject) => {
            instance.db.run(command, (err) => {
                if(err) {
                    if (err.code == 'SQLITE_ERROR') {
                        // La table existe déjà. On veut pas le savoir
                        resolve();
                    }
                    else {
                        instance.works = false;
                        console.log(err.message);
                        reject(err);
                    }
                }
                resolve();
            });
        })
    }

    verify_tables() {
        const create_tables_commands = [
            'CREATE TABLE occupation_mean(time DATETIME primary key, value float)',
            'CREATE TABLE occupation_standard_deviation(time DATETIME primary key, value float)',
            'CREATE TABLE occupation_variance(time DATETIME primary key, value float)'
        ];
        let promises = [];
        create_tables_commands.forEach((command) => {
            promises.push(this.create_table(command));
        });
    
        let instance = this;

        return new Promise( (resolve, reject) => {
            Promise.all(promises)
            .then(() => {
                instance.works = true;
                resolve();
            })
            .catch((error) => {reject(error)});
        });
    }

    drop_tables() {
        const drop_table_commands = [
            'DROP TABLE occupation_mean',
            'DROP TABLE occupation_standard_deviation',
            'DROP TABLE occupation_variance'
        ];
        drop_table_commands.forEach((command) => {
            this.db.run(command, (err) => {
                if(err) {
                    return console.log(err.message);
                }
            });
        });
    }

    add_entry(table, time, value) {
        if (!this.works) {
            this.unsaved_data.push({table: table, time: time, value: value});
            return;
        }
        this.db.run('INSERT INTO '+table+'(time, value) VALUES("'+time+'",'+value+')' , (err) => {
            if(err) {
                this.unsaved_data.push({table: table, time: time, value: value});
                this.bd_is_down()
                if (err.code == 'SQLITE_READONLY') {
                    return; // pass
                }
                console.log("Erreur insertion pour "+db_infos.name+": "+err.message); 
            }
        });
    }

    bd_is_down() {
        if (this.works != false) {
            console.log(this.name+" bd is down!");
            this.works = false;
        }
        this.recover_bd();
    }

    recover_bd() {
        if (this.in_recovery) {
            return;
        }
        this.in_recovery = true;
        this.start_db()
        .then(() => {
            let unsaved_data_copy = this.unsaved_data;
            this.unsaved_data = [];
            unsaved_data_copy.forEach((data) => {
                this.add_entry(data.table, data.time, data.value);
            });
            synchronise();
            this.in_recovery = false;
        });
    }
}

const dbs_infos = [
    new Database("primary"),
    new Database("secondary")
]

function init_dbs() {
    let promises = [];
    dbs_infos.forEach((db) => {
        promises.push(db.start_db());
    });

    Promise.all(promises)
    .then(() => {
        synchronise();
    })
    .catch((error) => {console.log(error);});
}

function select_working_db() {
    if (dbs_infos[0].works) {
        return dbs_infos[0].db;
    }
    else if (dbs_infos[1].works) {
        return dbs_infos[1].db; 
    }
    else {
        // console.log("Aucune bd ne fonctionne");
        return null;
    }
}

function synchronise() {
    const table_names = [
        'occupation_mean',
        'occupation_standard_deviation',
        'occupation_variance'
    ];
    dbs_infos.forEach((current_db) => {
        table_names.forEach((table_name) => {
            current_db.db.get('SELECT * FROM '+table_name , (err, row) => {
                dbs_infos.forEach((other_db) => {
                    if (!other_db.works) {
                        return;
                    }
                    if (row != null && current_db.name != other_db.name) {
                        other_db.db.run('INSERT INTO '+table_name+'(time, value) VALUES("'+row.time+'",'+row.value+')' , (err) => {
                            if(err) {
                                if (err.code == 'SQLITE_CONSTRAINT') {
                                    return; // pass
                                }
                                console.log("Erreur insertion durant synchronisation de "+current_db.name+": "+err.message); 
                            }
                        });
                    }
                });
                if(err) {
                    console.log("Erreur selection durant synchronisation de "+current_db.name+": "+err.message); 
                }
            });
        });
    });
}

init_dbs();

exports.add = (table, time, value) => {
    dbs_infos.forEach((db) => {
        db.add_entry(table, time, value);
    });
}

exports.select_last = async (table) => {
    return new Promise( (resolve, reject) => {
        const db = select_working_db();
        if (!db) {
            reject("All databases are down");
        }
        db.get('SELECT * FROM '+table+' WHERE time=(SELECT max(time) FROM '+table+')', (err, row) => {
            if(err) {
                db.bd_is_down();
                reject(err);
            }
            resolve({"table": table, "row": row});
        })
    })
}

exports.select_between_interval = async (table, startDate, endDate) => {
    return new Promise( (resolve, reject) => {
        const db = select_working_db();
        if (!db) {
            reject("All databases are down");
        }
        db.get('SELECT * FROM '+table+' WHERE time BETWEEN \''+startDate+'\' AND \'' +endDate+'\'', (err,row) => {
            if(err) {
                console.log(err.message);
                db.bd_is_down();
                reject(err);
            }
            console.log("sql answer : " + row);
            resolve({"table": table, "row": row});
        });
    });
}


