'use strict';

const fs = require("fs");
const steem = require('steem');
const AWS = require('aws-sdk')
const nodemailer = require('nodemailer')

const config = JSON.parse(fs.readFileSync("./config.json"));
const execSync = require('child_process').execSync;

const functions = require('./functions');
const log = functions.log;
const runInterval = functions.runInterval;

// The key to broadcast if we want to disable the witness
const disabled_key = "STM1111111111111111111111111111111114T1Anm";

// Use AWS with config
const sns = config.aws ? new AWS.SNS({
    region: config.aws.region,
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
}) : null

const transporter = nodemailer.createTransport({
    port: config.email.port,               // true for 465, false for other ports
    host: config.email.host,
    auth: {
        user: config.email.user,
        pass: config.email.pass,
    },
    secure: true,
});

// Connect to the specified RPC node
const rpc_node = config.rpc_nodes ? config.rpc_nodes[0] : (config.rpc_node ? config.rpc_node : 'https://api.steemit.com');
steem.api.setOptions({ transport: 'https', uri: rpc_node, url: rpc_node });

let missData = [];
let lastSms = null;
startProcess();
runInterval(startProcess, config.interval * 1000, 99999999999999);

function getWitness(id) {
    return new Promise((resolve, reject) => {
        steem.api.getWitnessByAccount(id, function (err, result) {
            if (!err) {
                resolve(result);
            } else {
                reject(err);
            }
        });
    });
}

function mail(subject, body) {
    const text = `${body} \n`
    const htmlText = text.replace('\n', '<br/>')
    transporter.sendMail({
        from: config.email.from,
        to: config.email.recipient,
        subject: subject,
        text: text,
        html: htmlText
    }, function (error) {
        if (error) console.log(error)
        else {
            console.log('sent email to ' + recipient)
        }
    });
}

function sms(subject) {
    if (sns === null) {
        console.warn('not set aws config!');
        return;
    }
    sns.publish({
        Message: `${config.account} ${subject}`,
        PhoneNumber: config.aws.number
    }, function (err, result) {
        console.log(err, result)
        if (err) {
            console.log(err)
        }
        lastSms = new Date().getTime() + (1 * 24 * 60 * 60 * 1000)
        console.log('sent sms to ' + config.aws.number)
    })
}

function switchTo(signing_key) {
    log("Switching to " + signing_key);
    const props = {};
    steem.broadcast.witnessUpdate(config.key, config.account, config.url, signing_key, props, config.fee, function (err, result) {
        mail("Switching Witness", "Your Witness Node has been switched to " + signing_key);
        console.log(err, result, stdout);
    });
}

function reportMissing(missed) {
    log("Report missing: " + missed);
    mail("Missing a Block", "Your Witness Node hass missed a block - total missing: " + missed);
    if (new Date().getTime() > lastSms)
    {
        console.log('Sending SMS')
        sms("Missing a Block")
    }
    else console.log('Sms already sent today')
}

function startMissingBlocks() {
    return (missData[missData.length - 1] - missData[0]) >= config.threshold;
}

async function startProcess() {
    const account = await getWitness(config.account);
    const signing_key = account.signing_key;

    // already disabled, so no point to switch
    if (signing_key === disabled_key) {
        throw "disabled already.";
    }

    const total_missed = account.total_missed;
    log(signing_key + " total missed = " + total_missed);
    missData.push(total_missed);

    // remove outdated entries to avoid memory growing
    if (missData.length > (config.period / config.interval)) {
        missData.shift();
    }

    if (missData.length > 2) {
        if (missData[missData.length - 1] - missData[missData.length - 2] > 0) {
            reportMissing(total_missed);
        }
    }

    if (startMissingBlocks()) {
        // remove current signing key
        const index = config.signing_keys.indexOf(signing_key);
        if (index > - 1) {
            config.signing_keys.splice(index, 1);
        }
        if (config.signing_keys.length === 0) {
            // disable it just in case
            switchTo(disabled_key, total_missed);
            throw `Error, no signing key to use. Thus disable it by switching to ${disabled_key}`;
        }
        switchTo(config.signing_keys[0]);
        // reset data
        missData = [];
    }
}
