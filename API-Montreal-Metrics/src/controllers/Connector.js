const subscribers = []

exports.publish = (original_message) => {
    var json = JSON.parse(original_message.toString());

    const new_topic = json.Desc;
    const new_message = {
        time: json.ExpiryUtc,
        value: json.Value,
    }

    subscribers.forEach( (subscriber) => {
        subscriber(new_topic, new_message);
    })
}

exports.subscribe = (subscriber) => {
    subscribers.push(subscriber);
}