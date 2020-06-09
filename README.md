# SteemWitnessAutoSwitch
Auto Switch Steem Witness Node

# How to use
1. Configure your settings in `config.json`
2. node `monitor-witness.js` or run via `pm2` i.e. `start.sh`

# Docker
1. Build docker image
```
git pull https://github.com/DoctorLai/SteemWitnessAutoSwitch.git
cd SteemWitnessAutoSwitch
docker build -t auto-switch .
```
2. Edit `config.json`
3. Run docker container
```
docker run -itd --name autoswitch \
           --restart always \
           -v $(pwd)/config.json:/app/config.json \
           auto-switch
```
