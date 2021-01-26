const http = require("http");
const dorita980 = require("dorita980");
const promClient = require("prom-client");

const irobotStatusGauge = new promClient.Gauge({
    name: "roomba_state",
    help: "The current state of the Roomba, 0 = stop, 1 = charging, 2 = run, 3 = hmUsrDock, 100 = unknown",
    labelNames: ["ip","missionid","state"]
});

const irobotCycleGauge = new promClient.Gauge({
    name: "roomba_cycle",
    help: "The current cycle of the Roomba, 0 = none, 1 = quick, 100 = unknown",
    labelNames: ["ip","missionid","cycle"]
});

const irobotExpireM = new promClient.Gauge({
    name: "roomba_mission_recharge_time",
    help: "Mission recharge time",
    labelNames: ["ip","missionid"]
});

const irobotRechrgM = new promClient.Gauge({
    name: "roomba_remaining_recharge_time",
    help: "Remaining time to recharge",
    labelNames: ["ip","missionid"]
});

const irobotError = new promClient.Gauge({
    name: "roomba_error",
    help: "None",
    labelNames: ["ip","missionid"]
});

const irobotNotReady = new promClient.Gauge({
    name: "roomba_notready",
    help: "None",
    labelNames: ["ip","missionid"]
});

const irobotMssnM = new promClient.Gauge({
    name: "roomba_mission_cleaning_elapsed_time",
    help: "Cleaning Elapsed Time",
    labelNames: ["ip","missionid"]
});

const irobotSqft = new promClient.Gauge({
    name: "roomba_mission_cleaned_squarefeet",
    help: "Squarefeet Cleaned",
    labelNames: ["ip","missionid"]
});

const irobotBat = new promClient.Gauge({
  name: "roomba_battery_percent",
  help: "Current Battery Load in Percent",
  labelNames: ["ip"]
});

const irobotBinfull = new promClient.Gauge({
  name: "roomba_bin_full",
  help: "If bin is full its 1",
  labelNames: ["ip"]
});

const irobotBinpresent = new promClient.Gauge({
  name: "roomba_bin_present",
  help: "If bin is not present its 1",
  labelNames: ["ip"]
});

const irobotInfo = new promClient.Gauge({
  name: "roomba_info",
  help: "Always 1, some infos about roomba here",
  labelNames: ["ip", "name", "softwareVersion", "batteryType", "hardwareRev", ]
});

const irobotOverallsqft = new promClient.Gauge({
  name: "roomba_overall_cleaned_sqft",
  help: "Cleaned Sqarefeet by Roomba in its life",
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

function getBinFull(data) {
  if (data["bin"]["full"]) {
    return 1
  }
  return 0
}

function getBinPresent(data) {
  if (data["bin"]["present"]) {
    return 0
  }
  return 1
}

const robot = new dorita980.Local(process.env.USERNAME, process.env.PASSWORD, process.env.ROOMBA_IP_ADDRESS, 2, process.env.INTERVAL_MS);
robot.on("connect", () => {
    console.log(`Connected to Roomba with IP: ${process.env.ROOMBA_IP_ADDRESS}`);
});

robot.on("mission", (data) => {
    //console.log(data);
    if (data && data["cleanMissionStatus"]) {
      status = getStatus(data)
      cycle = getCycle(data)
      irobotStatusGauge.labels(process.env.ROOMBA_IP_ADDRESS,data["cleanMissionStatus"]["nMssn"],data["cleanMissionStatus"]["phase"]).set(status);
      irobotCycleGauge.labels(process.env.ROOMBA_IP_ADDRESS,data["cleanMissionStatus"]["nMssn"],data["cleanMissionStatus"]["cycle"]).set(cycle);
      irobotExpireM.labels(process.env.ROOMBA_IP_ADDRESS,data["cleanMissionStatus"]["nMssn"]).set(data["cleanMissionStatus"]["expireM"]);
      irobotRechrgM.labels(process.env.ROOMBA_IP_ADDRESS,data["cleanMissionStatus"]["nMssn"]).set(data["cleanMissionStatus"]["rechrgM"]);
      irobotError.labels(process.env.ROOMBA_IP_ADDRESS,data["cleanMissionStatus"]["nMssn"]).set(data["cleanMissionStatus"]["error"]);
      irobotNotReady.labels(process.env.ROOMBA_IP_ADDRESS,data["cleanMissionStatus"]["nMssn"]).set(data["cleanMissionStatus"]["notReady"]);
      irobotMssnM.labels(process.env.ROOMBA_IP_ADDRESS,data["cleanMissionStatus"]["nMssn"]).set(data["cleanMissionStatus"]["mssnM"]);
      irobotSqft.labels(process.env.ROOMBA_IP_ADDRESS,data["cleanMissionStatus"]["nMssn"]).set(data["cleanMissionStatus"]["sqft"]);
    }
    robot.getRobotState(['batPct', 'bbrun', 'bin']).then((actualState) => {
      if (actualState && actualState["batPct"] && actualState["bin"] && actualState["bbrun"]) {
        irobotBat.labels(process.env.ROOMBA_IP_ADDRESS).set(actualState["batPct"]);
        irobotBinfull.labels(process.env.ROOMBA_IP_ADDRESS).set(getBinFull(actualState));
        irobotBinpresent.labels(process.env.ROOMBA_IP_ADDRESS).set(getBinPresent(actualState));
        irobotInfo.labels(process.env.ROOMBA_IP_ADDRESS,actualState["name"],actualState["softwareVer"],actualState["batteryType"],actualState["hardwareRev"]).set(1);
        irobotOverallsqft.labels(process.env.ROOMBA_IP_ADDRESS).set(actualState["bbrun"]["sqft"]);
      }
    });
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
