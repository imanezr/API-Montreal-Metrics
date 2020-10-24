exports.mean = (data) => {
    let total = 0
    data.forEach((message) => {
        total += message.value;
    });
    return total/data.length;
}

exports.variance = (data) => {
    const average = this.mean(data);
    let sum_squared_distances = 0;
    data.forEach((message) => {
        const distance = message.value-average;
        sum_squared_distances += distance*distance;
    })
    return sum_squared_distances/(data.length);
}

exports.standard_deviation = (data) => {
    return Math.sqrt(this.variance(data));
}