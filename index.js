const express = require('express');
const app = express();
const _ = require('underscore');
const jsforce = require('jsforce');
const bodyParser = require('body-parser');
const request = require('request');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const faye = require('faye');
const settings = require("./settings.json");

let opportunities = [];
let sockets = [];
let conn = null;

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('public'));

app.get('/login', function (req, res) {
    res.redirect(settings["login-url"] + '/services/oauth2/authorize?'
        + '&response_type=code'
        + '&client_id=' + settings["consumer-key"]
        + '&redirect_uri=' + settings["redirect-uri"]
    );
});

app.get('/oauth2/callback', function (req, res) {
    let code = req.query.code;
    let url = settings["login-url"] + '/services/oauth2/token?grant_type=authorization_code&code=' + encodeURIComponent(code)
        + '&client_id=' + settings["consumer-key"]
        + '&client_secret=' + settings["consumer-secret"]
        + '&redirect_uri=' + settings["redirect-uri"];
    console.log(url);
    request.post(url, function (error, response, body) {
        let jsn = JSON.parse(body);
        conn = new jsforce.Connection({
            instanceUrl: jsn.instance_url,
            accessToken: jsn.access_token
        });
        subscribe();
        res.redirect('/');
    })
});

app.get('/', function (req, res) {
    if (conn == null) {
        res.redirect('login');
    } else {
        res.render('pages/index');
    }
});

app.get('/opportunity', function (req, res) {
    res.json(opportunities);
});

app.post('/invoice', function (req, res) {
    let opportunity = req.body;
    console.log('**** Generate invoice for ', req.body);
    let bilParam = {Status__c: 'Billed', OpportunityId__c: opportunity.id};
    console.log('Bil param:', bilParam);
    conn.sobject("OpportunityBilled__e").create(bilParam, function (err, ret) {
        if (err || !ret.success) {
            return console.error(err, ret);
        }
        console.log("Created record id : ", opportunity);
    });

});

io.on('connection', function (_socket) {
    sockets.push(_socket);
    console.log('User subscribed!')
});

http.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

function subscribe() {
    console.log('Observing Opportunity events...');
    let endpoint = conn.instanceUrl + '/cometd/40.0/';
    let client = new faye.Client(endpoint);
    client.setHeader('Authorization', 'OAuth ' + conn.accessToken);
    client.subscribe('/event/OpportunitySubmitted__e', function (message) {
        console.log('Event received', message);
        opportunities.push(message);
        _.each(sockets, function (socket) {
            socket.emit('opportunity', message);
        })
    });
}