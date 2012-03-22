//deps
var fs = require('fs');
var http = require('http');

// configuration
var config = JSON.parse(fs.readFileSync(require.resolve('./config.json')));
var interval = config.interval;
var hostname = config.host;
var port = config.port;
var auth_base64 = new Buffer(config.auth_usr + ':' + config.auth_pwd).toString('base64');
var http_req_ops = {
    host: hostname,
    port: port,
    path: '/api/queues',
    method: 'GET',
    headers: {"Authorization":"Basic " + auth_base64}
};

//posting metrics to nervous
function post_data(axon, metric_path, name, value) {
    axon.emit('data', metric_path + '.' + name, value);
}

//processing json for a rabbitmq queue
function process_queue(axon, queue) {
    var metric_path = 'queues.' + JSON.stringify(queue['name']).replace(/"/g, '');

    post_data(axon, metric_path + '.messages_details', 'rate', JSON.stringify(queue['messages_details']['rate']));
    post_data(axon, metric_path + '.messages_details', 'last_event', JSON.stringify(queue['messages_details']['last_event']));
    post_data(axon, metric_path + '.messages_ready_details', 'rate', JSON.stringify(queue['messages_ready_details']['rate']));
    post_data(axon, metric_path + '.messages_ready_details', 'last_event', JSON.stringify(queue['messages_ready_details']['last_event']));
    post_data(axon, metric_path + '.messages_unacknowledged_details', 'rate', JSON.stringify(queue['messages_unacknowledged_details']['rate']));
    post_data(axon, metric_path + '.messages_unacknowledged_details', 'last_event', JSON.stringify(queue['messages_unacknowledged_details']['last_event']));

    if (queue['message_stats'] != null) {
        if (queue['message_stats']['ack_details'] != null) {
            post_data(axon, metric_path + '.message_stats.ack_details', 'rate', JSON.stringify(queue['message_stats']['ack_details']['rate']));
            post_data(axon, metric_path + '.message_stats.ack_details', 'last_event', JSON.stringify(queue['message_stats']['ack_details']['last_event']));

        }
        if (queue['message_stats']['deliver_details'] != null) {
            post_data(axon, metric_path + '.message_stats.deliver_details', 'rate', JSON.stringify(queue['message_stats']['deliver_details']['rate']));
            post_data(axon, metric_path + '.message_stats.deliver_details', 'last_event', JSON.stringify(queue['message_stats']['deliver_details']['last_event']));

        }
        if (queue['message_stats']['deliver_get_details'] != null) {
            post_data(axon, metric_path + '.message_stats.deliver_get_details', 'rate', JSON.stringify(queue['message_stats']['deliver_get_details']['rate']));
            post_data(axon, metric_path + '.message_stats.deliver_get_details', 'last_event', JSON.stringify(queue['message_stats']['deliver_get_details']['last_event']));

        }
    }

    post_data(axon, metric_path, 'messages_ready', JSON.stringify(queue['messages_ready']));
    post_data(axon, metric_path, 'messages_unacknowledged', JSON.stringify(queue['messages_unacknowledged']));
    post_data(axon, metric_path, 'messages', JSON.stringify(queue['messages']));
    post_data(axon, metric_path, 'consumers', JSON.stringify(queue['consumers']));
    post_data(axon, metric_path, 'memory', JSON.stringify(queue['memory']));
}

//plugin main function
module.exports = function(axon) {
    var check_stats = function() {
        var req_body = '';
        var req = http.request(http_req_ops, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                req_body = req_body + chunk;
            });
            res.on('end', function () {
                json_queues = JSON.parse(req_body);
                queue_count = json_queues.length;
                for (i = 0; i <= queue_count - 1; i++) {
                    queue_json = json_queues[i];
                    process_queue(axon, queue_json);
                }
            });
        });
        req.end();
    }

    setInterval(check_stats, interval);
};