'use strict';

const fs = require("fs");
const steem = require('steem');

const config = JSON.parse(fs.readFileSync("./config.json"));
const execSync = require('child_process').execSync;

const functions = require('./functions');
const log = functions.log;
const runInterval = functions.runInterval;

// The key to broadcast if we want to disable the witness
const disabled_key = "STM1111111111111111111111111111111114T1Anm";

// Connect to the specified RPC node
const rpc_node = config.rpc_nodes ? config.rpc_nodes[0] : (config.rpc_node ? config.rpc_node : 'https://api.steemit.com');
steem.api.setOptions({ transport: 'https', uri: rpc_node, url: rpc_node });

let missData = [];

startProcess();
runInterval(startProcess, config.interval * 1000, 99999999999999);

function getWitness(id) {
    return new Promise((resolve, reject) => {
        steem.api.getWitnessByAccount(id, function(err, result) {
            if (!err) {
                resolve(result);
            } else {
                reject(err);
            }
        });
    });
}   

function mail(subject, body) {
    // send email with subject and body here
    // TODO
    console.log("MAILTO: " + subject);
    console.log("MAILTO: " + body);
}

function switchTo(signing_key) {
    log("Switching to " + signing_key);
    const props = {};    
    steem.broadcast.witnessUpdate(config.key, config.account, config.url, signing_key, props, config.fee, function(err, result) {
        mail("Switching Witness", "Your Witness Node has been switched to " + consigning_keyfig);
        console.log(err, result, stdout);
    });    
} 

function reportMissing(missed) {
    log("Report missing: " + missed);
    mail("Missing a Block", "Your Witness Node hass missed a block - total missing: " + missed);
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
