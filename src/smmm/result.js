const fs = require("node:fs");
let pth = "C:\\Users\\Rahul Ghuge\\OneDrive\\Documents\\EPA SWMM Projects\\Samples\\Inlet_Drains_Model.out";

class ResultFile {
    //class to read the binary data of swmm5

    constructor(filePath = null) {
        this.path = filePath;
        this.dataView = null;
        this.noOfLinks = null;
        this.noOfNodes = null;
        this.noOfSubcatchments = null;
        this.version = null;
        this.noOfPolutants = null;
        this.flowUnit = null;
        this.identificationNumber = null;
        this.offset = 0;
        this.polutantUnits = [];
        this.results = { subcatchments: {}, nodes: {}, links: {}, polutant: {} };
    }

    readBinFile(filePath = null) {
        filePath = filePath ? filePath : this.path;
        const rawFile = fs.readFileSync(filePath);
        const dataView = new DataView(rawFile.buffer);
        this.dataView = dataView;
        return dataView;
    }

    readBasedata() {
        // each record is of 4 bytes
        //read all properties.
        this.identificationNumber = this.dataView.getInt32(this.offset, true); //itentification number.
        this.offset += 4; //increament 4 bytes

        this.version = this.dataView.getInt32(this.offset, true);
        this.offset += 4; //increament 4 bytes

        this.flowUnit = this.dataView.getInt32(this.offset, true);
        this.offset += 4; //increament 4 bytes

        this.noOfSubcatchments = this.dataView.getInt32(this.offset, true);
        this.offset += 4; //increament 4 bytes

        this.noOfNodes = this.dataView.getInt32(this.offset, true);
        this.offset += 4; //increament 4 bytes

        this.noOfLinks = this.dataView.getInt32(this.offset, true);
        this.offset += 4; //increament 4 bytes
        this.noOfPolutants = this.dataView.getInt32(this.offset, true);
        this.offset += 4; //increament 4 bytes
    }

    readIDNames(count) {
        const names = {};

        for (let i = 0; i < count; i++) {
            const nameLength = this.dataView.getInt32(this.offset, true);
            this.offset += 4; // Number of characters in the name
            const nameChars = [];

            for (let j = 0; j < nameLength; j++) {
                nameChars.push(String.fromCharCode(this.dataView.getUint8(this.offset++)));
            }

            names[nameChars.join('')] = {};
        }

        return names;
    }

    readAllElementNames() {
        this.subCatchments = this.readIDNames(this.noOfSubcatchments);
        this.nodes = this.readIDNames(this.noOfNodes);
        this.links = this.readIDNames(this.noOfLinks);
        this.pollutant = this.readIDNames(this.noOfPolutants);

        //read polutants unit codes
        for (let i = 0; i < this.noOfPolutants; i++) {
            const unitCode = this.dataView.getInt32(this.offset, true);
            this.offset += 4;
            this.polutantUnits.push(unitCode);
        }
    }

    readProperties() {
        // Read subcatchment properties
        this._numSubcatchmentProperties = this.dataView.getInt32(this.offset, true);
        this.offset += 4;

        this._subcatchmentPropertyCodes = [];
        for (let i = 0; i < this._numSubcatchmentProperties; i++) {
            this._subcatchmentPropertyCodes.push(this.dataView.getInt32(this.offset, true));
            this.offset += 4;
        }

        this._subcatchmentProperties = [];
        for (let i = 0; i < this.noOfSubcatchments; i++) {
            this._subcatchmentProperties.push(this.dataView.getFloat32(this.offset, true));
            this.offset += 4;
        }

        // Read node properties
        this._numNodeProperties = this.dataView.getInt32(this.offset, true);
        this.offset += 4;
        this._nodePropertyCodes = [];
        for (let i = 0; i < this._numNodeProperties; i++) {
            this._nodePropertyCodes.push(this.dataView.getInt32(this.offset, true));
            this.offset += 4;
        }

        this._nodeProperties = [];
        for (let i = 0; i < this.noOfNodes; i++) {
            const properties = {
                typeCode: this.dataView.getFloat32(this.offset, true),
                invertElevation: this.dataView.getFloat32(this.offset + 4, true),
                maxDepth: this.dataView.getFloat32(this.offset + 8, true),
            };
            this.offset += 12;
            this._nodeProperties.push(properties);
        }

        // Read link properties
        this._numLinkProperties = this.dataView.getInt32(this.offset, true);
        this.offset += 4;
        this._linkPropertyCodes = [];

        for (let i = 0; i < this._numLinkProperties; i++) {
            this._linkPropertyCodes.push(this.dataView.getInt32(this.offset, true));
            this.offset += 4;
        }

        this._linkProperties = [];

        for (let i = 0; i < this.noOfLinks; i++) {
            const properties = {
                typeCode: this.dataView.getFloat32(this.offset, true),
                upstreamOffset: this.dataView.getFloat32(this.offset + 4, true),
                downstreamOffset: this.dataView.getFloat32(this.offset + 8, true),
                maxDepth: this.dataView.getFloat32(this.offset + 12, true),
                length: this.dataView.getFloat32(this.offset + 16, true),
            };
            this.offset += 20;
            this._linkProperties.push(properties);
        }

    }

    readClosingRecords() {
        let offset = this.dataView.byteLength - 24;
        this.oIdNameStart = this.dataView.getInt32(this.offset, true);
        offset += 4;
        this.oPropStart = this.dataView.getInt32(this.offset, true);
        offset += 4;
        this.comResultStart = this.dataView.getInt32(this.offset, true);
        offset += 4;
        this.noOFrepoPeriod = this.dataView.getInt32(this.offset, true);
        offset += 4;
        this.errorCode = this.dataView.getInt32(this.offset, true);
        offset += 4;
    }

    readVariables() {
        // Subcatchment Variables
        this._numSubcatchmentVariables = this.dataView.getInt32(this.offset, true); this.offset += 4;
        this._subcatchmentVariableCodes = [];

        for (let i = 0; i < this._numSubcatchmentVariables; i++) {
            let varCode = this.dataView.getInt32(this.offset, true);
            let key = varCode;

            if (varCode in SUBCATCHMENTVARS){
                key = SUBCATCHMENTVARS[varCode];
            }

            this._subcatchmentVariableCodes.push(key); this.offset += 4;
        }

        // Node Variables
        this._noNodeVariables = this.dataView.getInt32(this.offset, true); this.offset += 4;
        this._nodeVariableCodes = [];

        for (let i = 0; i < this._noNodeVariables; i++) {
            let varCode = this.dataView.getInt32(this.offset, true);
            let key = varCode;

            if (varCode in NODEVARS){
                key = NODEVARS[varCode];
            }

            this._nodeVariableCodes.push(key); this.offset += 4;
        }

        // Link Variables
        this._noLinkVariables = this.dataView.getInt32(this.offset, true); this.offset += 4;
        this._linkVariableCodes = [];

        for (let i = 0; i < this._noLinkVariables; i++) {
            let varCode = this.dataView.getInt32(this.offset, true);
            let key = varCode;

            if (varCode in LINKVARS){
                key = LINKVARS[varCode];
            }

            this._linkVariableCodes.push(key); this.offset += 4;
        }

        // System-wide Variables
        this._noSystemVariables = this.dataView.getInt32(this.offset, true); this.offset += 4;
        this._systemVariableCodes = [];

        for (let i = 0; i < this._noSystemVariables; i++) {
            let varCode = this.dataView.getInt32(this.offset, true);
            let key = varCode;

            if (varCode in SYSTEMVARS){
                key = SYSTEMVARS[varCode];
            }

            this._systemVariableCodes.push(key); this.offset += 4;
        }
    }

    readReportingInterval() {
        this.startDateTime = this.dataView.getFloat64(this.offset, true); //8 bytes
        this.offset += 8;
        this.interval = this.dataView.getInt32(this.offset, true); //8 bytes
        this.offset += 4;
    }

    readResults() {
        //last position of result bytes. last 24 bytes are closing records.
        let lastResByte = this.dataView.byteLength - 24;
        //ensure the we starts from correct position.
        if (this.offset != this.comResultStart) {
            this.offset = this.comResultStart;
        }

        while (this.offset < lastResByte) {
            // Read date/time as 8-byte double
            const dateTime = this.dataView.getFloat64(this.offset, true); this.offset += 8;

            // Read subcatchment variables
            for (let i = 0; i < this.noOfSubcatchments; i++) {
                const subcatchmentData = { date: dateTime };
                this._subcatchmentVariableCodes.forEach((code, index) => {
                    subcatchmentData[code] = this.dataView.getFloat32(this.offset, true);
                    offset += 4;
                });
                // reportingPeriod.subcatchments.push(subcatchmentData);
            }

            // Read node variables
            for (let i = 0; i < this.noOfNodes; i++) {
                const nodeData = {};
                this._nodeVariableCodes.forEach((code, index) => {
                    nodeData[code] = this.dataView.getFloat32(this.offset, true);
                    offset += 4;
                });
                reportingPeriod.nodes.push(nodeData);
            }

            // Read link variables
            for (let i = 0; i < this.noOfLinks; i++) {
                const linkData = {};
                this._linkVariableCodes.forEach((code, index) => {
                    linkData[code] = this.dataView.getFloat32(this.offset, true);
                    offset += 4;
                });
                reportingPeriod.links.push(linkData);
            }

            // Read system-wide variables
            const systemData = {};
            systemVariableCodes.forEach((code, index) => {
                systemData[code] = this.dataView.getFloat32(this.offset, true);
                offset += 4;
            });

            reportingPeriod.systemVariables = systemData;

            results.push(reportingPeriod);
        }
    }
}

// Dictionary for Subcatchment Variables
const SUBCATCHMENTVARS = {
    0: 'rainfall',
    1: 'snow depth',
    2: 'evaporation',
    3: 'infiltration',
    4: 'runoff',
    5: 'groundwater',
    6: 'gWElevation',
    7: 'moisture',
    // Pollutant concentrations start from 8 and continue as needed
};

// Dictionary for Node Variables
const NODEVARS = {
    0: 'depth',
    1: 'head',
    2: 'volume',
    3: 'lateralInflow',
    4: 'totalInflow',
    5: 'flowLost',
    // Pollutant concentrations start from 6 and continue as needed
};

// Dictionary for Link Variables
const LINKVARS = {
    0: 'flowRate',
    1: 'flowDepth',
    2: 'velocity',
    3: 'volume',
    4: 'areaFilled',
    // Pollutant concentrations start from 5 and continue as needed
};

// Dictionary for System-Wide Variables
const SYSTEMVARS = {
    0: 'airTemperature',
    1: 'rainfall',
    2: 'snowDepth',
    3: 'evapInfiltRate',
    4: 'runoffFlow',
    5: 'dryWeatherInflow',
    6: 'groundwaterInflow',
    7: 'RDIIInflow',
    8: 'userInflow',
    9: 'totalInflow',
    10: 'flowLost',
    11: 'flowLeavingOutfall',
    12: 'volumeStored',
    13: 'actEvaporation',
    14: 'potEvaporation'
};

let rd = new ResultFile(pth);
rd.readBinFile();
rd.readBasedata();
rd.readAllElementNames();
rd.readProperties();
rd.readClosingRecords()

console.log(rd);
