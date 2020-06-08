#!/bin/bash
pm2 delete monitor-witness
pm2 start monitor-witness.js --max-memory-restart 200M
