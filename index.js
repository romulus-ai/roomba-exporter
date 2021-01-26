const http = require("http");
const dorita980 = require("dorita980");
const promClient = require("prom-client");

const irobotStatusGauge = new promClient.Gauge({
    name: "roomba_state",
    help: "The current state of the Roomba, 0 = stop, 1 = charging, 2 = run, 3 = hmUsrDock, 100 = unknown",
    labelNames: ["ip","state"]
});

const irobotCycleGauge = new promClient.Gauge({
    name: "roomba_cycle",
    help: "The current cycle of the Roomba, 0 = none, 1 = quick, 100 = unknown",
    labelNames: ["ip","cycle"]
});

const irobotExpireM = new promClient.Gauge({
    name: "roomba_expirem",
    help: "None",
    labelNames: ["ip"]
});

const irobotRechrgM = new promClient.Gauge({
    name: "roomba_rechrgm",
    help: "None",
    labelNames: ["ip"]
});

const irobotError = new promClient.Gauge({
    name: "roomba_error",
    help: "None",
    labelNames: ["ip"]
});

const irobotNotReady = new promClient.Gauge({
    name: "roomba_notready",
    help: "None, 16 may is, trashbin is full",
    labelNames: ["ip"]
});

const irobotMssnM = new promClient.Gauge({
    name: "roomba_mssnm",
    help: "None",
    labelNames: ["ip"]
});

const irobotSqft = new promClient.Gauge({
    name: "roomba_sqft",
    help: "None",
    labelNames: ["ip"]
});

const irobotnMssn = new promClient.Gauge({
    name: "roomba_nmssn",
    help: "None",
    labelNames: ["ip"]
});

const roombaStatus = {
    stopped: 0,
    charging: 1,
    running: 2,
    searchdock: 3,
    unknown: 100
};

const roombaCycle = {
    none: 0,
    quick: 1,
    unknown: 100
};

function getStatus(data) {
    if (data && data["cleanMissionStatus"]) {
      if (data["cleanMissionStatus"]["phase"] === "charge") {
        return roombaStatus.charging;
      } else if (data["cleanMissionStatus"]["phase"] === "stop") {
        return roombaStatus.stopped;
      } else if (data["cleanMissionStatus"]["phase"] === "run") {
        return roombaStatus.running;
      } else if (data["cleanMissionStatus"]["phase"] === "hmUsrDock") {
        return roombaStatus.searchdock;
      }
    }
    return roombaStatus.unknown;
}

function getCycle(data) {
    if (data && data["cleanMissionStatus"]) {
      if (data["cleanMissionStatus"]["cycle"] === "quick") {
        return roombaCycle.quick;
      } else if (data["cleanMissionStatus"]["cycle"] === "none") {
        return roombaCycle.none;
      }
    }
    return roombaCycle.unknown;
}

var cleanMissionStatus = 5000; // default is 800ms
const robot = new dorita980.Local(process.env.USERNAME, process.env.PASSWORD, process.env.ROOMBA_IP_ADDRESS, 2, cleanMissionStatus);
robot.on("connect", () => {
    console.log(`Connected to Roomba with IP: ${process.env.ROOMBA_IP_ADDRESS}`);
});

robot.on("mission", (data) => {
    //console.log(data);
    if (data && data["cleanMissionStatus"]) {
      status = getStatus(data)
      cycle = getCycle(data)
      irobotStatusGauge.labels(process.env.ROOMBA_IP_ADDRESS,data["cleanMissionStatus"]["phase"]).set(status);
      irobotCycleGauge.labels(process.env.ROOMBA_IP_ADDRESS,data["cleanMissionStatus"]["cycle"]).set(cycle);
      irobotExpireM.labels(process.env.ROOMBA_IP_ADDRESS).set(data["cleanMissionStatus"]["expireM"]);
      irobotRechrgM.labels(process.env.ROOMBA_IP_ADDRESS).set(data["cleanMissionStatus"]["rechrgM"]);
      irobotError.labels(process.env.ROOMBA_IP_ADDRESS).set(data["cleanMissionStatus"]["error"]);
      irobotNotReady.labels(process.env.ROOMBA_IP_ADDRESS).set(data["cleanMissionStatus"]["notReady"]);
      irobotMssnM.labels(process.env.ROOMBA_IP_ADDRESS).set(data["cleanMissionStatus"]["mssnM"]);
      irobotSqft.labels(process.env.ROOMBA_IP_ADDRESS).set(data["cleanMissionStatus"]["sqft"]);
      irobotnMssn.labels(process.env.ROOMBA_IP_ADDRESS).set(data["cleanMissionStatus"]["nMssn"]);
    }
    //console.log(robot.getSys());
});

robot.on("close", () => {
    console.log("connection to robot closed");
});

const server = http.createServer((req, res) => {
    res.end(promClient.register.metrics());
});

server.listen(process.env.PORT || 9117);


// Aufbohren und mehr Daten abrufen:
// https://github.com/koalazak/dorita980#

// https://github.com/koalazak/dorita980#getrobotstatearray-waitforfields oder get Prefenerences()
