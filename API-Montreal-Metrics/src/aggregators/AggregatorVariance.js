const connector = require('../controllers/Connector')
const database_handler = require('../db/DatabaseHandler')
const mathFunctions = require('./MathFunctions')

const aggregator_name = "occupation_variance"
const aggregator_topic = "Lane occupancy";
let data = []

function aggregate(topic, message) {
    if (topic == aggregator_topic) {
        if (data.length == 0
            || message.time == data[0].time) {
            data.push(message);
        }
        else {
            let mean = mathFunctions.variance(data)
            database_handler.add(aggregator_name, data[0].time, mean);
            data = [message];
        }
    }
}

connector.subscribe(aggregate);