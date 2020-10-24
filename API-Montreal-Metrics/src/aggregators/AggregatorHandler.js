exports.start_aggregators = (configuration) => {
    configuration.aggregators.forEach((aggretor_name) => {
        require('./'+aggretor_name)
    })
}