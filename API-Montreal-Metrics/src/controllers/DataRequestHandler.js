var fs = require('fs');

const database_handler = require('../db/DatabaseHandler');
const aggregatorHandler = require('../aggregators/AggregatorHandler');

const configuration = JSON.parse(fs.readFileSync('./src/configuration.json', 'utf8'));

aggregatorHandler.start_aggregators(configuration);

exports.data = {
    time: null,
    occupation_mean: null,
    occupation_variance: null,
    occupation_standard_deviation: null,
};


function refresh(data) {
    
    let promises = [
        database_handler.select_last("occupation_mean"),
        database_handler.select_last("occupation_variance"),
        database_handler.select_last("occupation_standard_deviation"),
    ];
    
    Promise.all(promises)
    .then((results) => {
        let previous_time = data.time;
        if (!results[0].row) {
            return;
        }
        data.time = results[0].row.time;
        results.forEach( (result) => {
            switch (result.table) {
                case "occupation_mean": data.occupation_mean = result.row.value; break;
                case "occupation_variance": data.occupation_variance = result.row.value; break;
                case "occupation_standard_deviation": data.occupation_standard_deviation = result.row.value; break;
            }
        })
        if (previous_time !== data.time) {
            console.log(data);
        }
    })
    .catch((error) => {console.log(error)});
    
};

refresh(this.data); // first time


setInterval(() => {refresh(this.data)}, 5000);