const fs = require("node:fs");

//section in Inp file.
const sections = {
    'title': null, 'options': null, 'report': null, 'files': null,
    'raingages': null, 'evaporation': null, 'temperature': null, 'adjustments': null,
    'subcatchments': null, 'subareas': null, 'infiltration': null,
    'lid_controls': null, 'lid_usage': null, 'aquifers': null, 'groundwater': null,
    'gwf': null, 'snowpacks': null, 'junctions': null, 'outfalls': null, 'dividers': null,
    'storage': null, 'conduits': null, 'pumps': null, 'orifices': null, 'weirs': null,
    'outlets': null, 'xsections': null, 'transects': null, 'streets': null, 'inlets': null,
    'losses': null, 'controls': null, 'pollutants': null, 'landuses': null, 'coverages': null,
    'loadings': null, 'buildup': null, 'washoff': null, 'treatment': null, 'inflows': null,
    'dwf': null, 'rdii': null, 'hydrographs': null, 'curves': null, 'timeseries': null,
    'patterns': null
}

class SWMMIo {
    /*
        SWMM INP file reader and writer class.

        This class provides read and write functionality for SWMM INP files.
        The SWMM Users Manual provides full documentation for the INP file format.
    */

    constructor() {
        this.sections = JSON.parse(JSON.stringify(sections));
        this.model = JSON.parse(JSON.stringify(sections));
    }
    
    /**
     * splits sections of inp file to dict.
     * @param {string} rawData 
     */
    splitSections(rawData) {
        let sections = rawData.split("[");

        sections.forEach((secText) => {
            if (secText && secText !== "") {
                let [section, secData] = sec.split("]");
                section = section.toLowerCase();

                if (secData.startsWith("\n")) {
                    secData = secData.slice(1);
                }

                if (section in this.sections) {
                    this.sections[section] = secData;
                }
            }
        });

    }

    /**
     * read inp file
     * @param {string} file 
     * @returns 
     */
    readFile(file) {
        file = file.replaceAll("\r\n", "\n"); //replace all \r
        file = file.replaceAll("\t", " "); //replace all \t
        
        let sections = file.split("[");

        sections.forEach((secText) => {
            if (secText.includes("]\n")) {
                secText = "[" + secText;
                let lines = secText.split("\n");

                if (lines.length > 0) {
                    let key = lines[0].toLowerCase().match(/\[([^\]]+)\]/g)[0].slice(1, -1);
                    this.sections[key] = secText;
                    let _key = key[0].toUpperCase() + key.slice(1);
                    let method = "read" + _key;

                    if (method in this) {
                        this.model[key] = this[method](secText, this.model[key]);
                    }
                }
            }
        });

        //assign the vertices to the objects whose
        if (Object.keys(this.model.pipes).length > 0) {
            this.model.pipes = this.assign_link_start_End(this.model.pipes);
        }

        if (Object.keys(this.model.pumps).length > 0) {
            this.model.pumps = this.assign_link_start_End(this.model.pumps);
        }

        if (Object.keys(this.model.valves).length > 0) {
            this.model.valves = this.assign_link_start_End(this.model.valves);
        }

        return this.model;
    }

    writTitle(titles=null) {
        if (!titles){
            titles = this.titles;
        }

        return "[TITLE]\n" + titles.join("\n");
    }

    readTitle(rawTitles) {
        let titles = rawTitles.split("\n").slice(1);

        if (titles[0]  === "[TITLE]") {
            titles.slice(1);
        }

        if (titles[titles.length - 1]  === "") {
            titles.pop();
        }
        this.model.titles = titles;
    }

    /**
     * function extracts options from text.
     * @param {string} rawOptions
     */
    readOptions(rawOptions) {
        let options = {
            FLOW_UNITS: null, INFILTRATION: null, FLOW_ROUTING: null,
            LINK_OFFSETS: null, FORCE_MAIN_EQUATION: null, IGNORE_RAINFALL: null,
            IGNORE_SNOWMELT: null, IGNORE_GROUNDWATER: null, IGNORE_RDII: null, IGNORE_ROUTING: null,
            IGNORE_QUALITY: null, ALLOW_PONDING: null, SKIP_STEADY_STATE: null,
            SYS_FLOW_TOL: null, LAT_FLOW_TOL: null, START_DATE: null,
            START_TIME: null, END_DATE: null, END_TIME: null,
            REPORT_START_DATE: null, REPORT_START_TIME: null, SWEEP_START: null,
            SWEEP_END: null, DRY_DAYS: null, REPORT_STEP: null,
            WET_STEP: null, DRY_STEP: null, ROUTING_STEP: null,
            LENGTHENING_STEP: null, VARIABLE_STEP: null, MINIMUM_STEP: null,
            INERTIAL_DAMPING: null, NORMAL_FLOW_LIMITED: null, SURCHARGE_METHOD: null,
            MIN_SURFAREA: null, MIN_SLOPE: null, MAX_TRIALS: null,
            HEAD_TOLERANCE: null, THREADS: null
        }

        let lines = rawOptions.split("\n");

        for (let line of lines) {
            if (line && (!line.startsWith(";") || !line.startsWith("["))) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let op = _line[0];
                let val = _line[1];

                options[op] = val;
            }
        }
        this.model.options = options;
    }

    writeOptions(data = null) {
        let opTexts = "[OPTIONS]\n";

        if (!data) {
            data = this.options;
        }

        for (let op in data) {
            if (this.options[op]) {
                opTexts += `${op} ${data[op]};\n`;
            }
        }

        return opTexts;
    }

    readReport(rawReport) {
        let report = {
            INPUT: null, CONTINUITY: null, FLOWSTATS: null,
            CONTROLS: null,
            SUBCATCHMENTS: null,
            NODES: null,
            LINKS: null, LID: null
        };

        const lines = rawReport.split("\n");

        for (let line in lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let op = _line[0];
                let val = _line[1];

                if (_line.length > 2) {
                    val = _line.slice(1);
                }

                report[op] = val;
            }
        }

        this.model.report = report;
    }

    writeReport(data = null) {
        let repTexts = "[REPORT]\n";

        if (!data) {
            data = this.report;
        }

        for (let rp of data) {
            if (data[rp] && !data[rp].length) {
                repTexts += `${rp} ${data[rp]};\n`;
            }

            if (data[rp] && data[rp].length) {
                let val = data[rp].join(" ");
                repTexts += `${rp} ${val};\n`;
            }
        }
    }

    readFiles(rawFiles = null) {
        let files = {
            USE: {
                RAINFALL: null, RUNOFF: null,
                HOTSTART: null, RDII: null,
                INFLOWS: null
            },
            SAVE: {
                RAINFALL: null, RUNOFF: null,
                HOTSTART: null, RDII: null,
                OUTFLOWS: null
            }
        };

        const lines = rawFiles.split("\n");

        for (let line in lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let useSave = _line[0];
                let prop = _line[1];
                let name = _line[2];

                if (useSave == "SAVE") {
                    files.SAVE[prop] = name;
                }

                if (useSave == "USE") {
                    files.USE[prop] = name;
                }
            }
        }

        this.model.files = files;
    }

    writeFiles(files = null) {
        let filesText = "[FILES]\n";

        for (let i of files.SAVE) {
            if (files.SAVE[i]) {
                filesText += `SAVE ${i} ${files.SAVE[i]}\n`;
            }
        }

        for (let i of files.USE) {
            if (files.USE[i]) {
                filesText += `USE ${i} ${files.USE[i]}\n`;
            }
        }
    }

    readRainGauges(text = null) {
        //let rainGauge = {Name: null, Form: null, Intvl: null, SCF: null, TIMESERIES: null, Tseries: null};
        let rainGauges = [];

        const lines = text.split("\n");

        for (let line in lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let name = _line[0];
                let form = _line[1];
                let intvl = _line[2];
                let scf = _line[3];
                let TsOrFile = _line[4];
                let tseriesOrFname = _line[5];
                let sta = _line[6];
                let unit = _line[7];

                if (TsOrFile == "TIMESERIES") {
                    let rainGauge = { name: name, form: form, intvl: intvl, scf: scf, tsorfile: "TIMESERIES", tseries: tseriesOrFname };
                    rainGauges.push(rainGauge);
                }

                if (TsOrFile == "FILE") {
                    let rainGauge = { name: name, form: form, intvl: intvl, scf: scf, tsorfile: "FILE", fname: tseriesOrFname, sta: sta, unit: unit };
                    rainGauges.push(rainGauge);
                }
            }
        }

        this.model.raingauges = rainGauges;
    }

    writeRainGauges(data = null) {
        let rText = "[RAINGAUGES]\n";

        if (!data) {
            data = this.raingauges;
        }

        for (let r of data) {
            rText = `${Object.values(r).join(" ")}\n`;
        }
        return rText;
    }

    readEvaporation(rawEvaporation) {
        let evaporation = {
            type: null,      // CONSTANT, MONTHLY, TIMESERIES, TEMPERATURE, FILE
            value: null,     // Holds the main value (constant rate, timeseries name, etc.)
            panCoefficients: null, // For FILE, optional monthly pan coefficients
            recoveryPattern: null, // For RECOVERY
            dryOnly: null    // For DRY_ONLY
        };

        const lines = rawEvaporation.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);

                // Parse each keyword and assign the corresponding values
                switch (_line[0]) {
                    case "CONSTANT":
                        evaporation.type = "CONSTANT";
                        evaporation.value = _line[1];
                        break;
                    case "MONTHLY":
                        evaporation.type = "MONTHLY";
                        evaporation.value = _line.slice(1); // e1 to e12
                        break;
                    case "TIMESERIES":
                        evaporation.type = "TIMESERIES";
                        evaporation.value = _line[1]; // Timeseries name
                        break;
                    case "TEMPERATURE":
                        evaporation.type = "TEMPERATURE";
                        break;
                    case "FILE":
                        evaporation.type = "FILE";
                        evaporation.panCoefficients = _line.slice(1); // Optional pan coefficients
                        break;
                    case "RECOVERY":
                        evaporation.recoveryPattern = _line[1]; // patternID
                        break;
                    case "DRY_ONLY":
                        evaporation.dryOnly = _line[1].toUpperCase();
                        break;
                }
            }
        }

        this.model.evaporation = evaporation;
    }

    writeEvaporation(data = null) {
        let evapText = "[EVAPORATION]\n";

        if (!data) {
            data = this.evaporation;
        }

        switch (data.type) {
            case "CONSTANT":
                evapText += `CONSTANT ${data.value}\n`;
                break;
            case "MONTHLY":
                evapText += `MONTHLY ${data.value.join(" ")}\n`;
                break;
            case "TIMESERIES":
                evapText += `TIMESERIES ${data.value}\n`;
                break;
            case "TEMPERATURE":
                evapText += `TEMPERATURE\n`;
                break;
            case "FILE":
                let panCoeffText = data.panCoefficients ? ` ${data.panCoefficients.join(" ")}` : "";
                evapText += `FILE${panCoeffText}\n`;
                break;
        }

        if (data.recoveryPattern) {
            evapText += `RECOVERY ${data.recoveryPattern}\n`;
        }

        if (data.dryOnly !== null) {
            evapText += `DRY_ONLY ${data.dryOnly}\n`;
        }

        return evapText;
    }

    readTemperature(rawTemperature) {
        let temperature = {
            type: null, // TIMESERIES, FILE, WINDSPEED, SNOWMELT, ADC IMPERVIOUS, ADC PERVIOUS
            tseries: null,
            file: { name: null, start: null, units: null },
            windspeed: { type: null, values: [] },
            snowmelt: { stemp: null, atiwt: null, rnm: null, elev: null, lat: null, dtlong: null },
            adc: { impervious: [], pervious: [] }
        };

        const lines = rawTemperature.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);

                // Parse each keyword and assign the corresponding values
                switch (_line[0]) {
                    case "TIMESERIES":
                        temperature.type = "TIMESERIES";
                        temperature.tseries = _line[1];
                        break;
                    case "FILE":
                        temperature.type = "FILE";
                        temperature.file.name = _line[1].replace(/\"/g, '');
                        if (_line.length > 2) {
                            temperature.file.start = _line[2];
                            temperature.file.units = _line[3] || 'C10'; // Default units
                        }
                        break;
                    case "WINDSPEED":
                        if (_line[1] === "MONTHLY") {
                            temperature.windspeed.type = "MONTHLY";
                            temperature.windspeed.values = _line.slice(2).map(parseFloat);
                        } else if (_line[1] === "FILE") {
                            temperature.windspeed.type = "FILE";
                        }
                        break;
                    case "SNOWMELT":
                        temperature.snowmelt.stemp = parseFloat(_line[1]);
                        temperature.snowmelt.atiwt = parseFloat(_line[2]);
                        temperature.snowmelt.rnm = parseFloat(_line[3]);
                        temperature.snowmelt.elev = parseFloat(_line[4]);
                        temperature.snowmelt.lat = parseFloat(_line[5]);
                        temperature.snowmelt.dtlong = parseFloat(_line[6]);
                        break;
                    case "ADC":
                        if (_line[1] === "IMPERVIOUS") {
                            temperature.adc.impervious = _line.slice(2).map(parseFloat);
                        } else if (_line[1] === "PERVIOUS") {
                            temperature.adc.pervious = _line.slice(2).map(parseFloat);
                        }
                        break;
                }
            }
        }

        this.model.temperature = temperature;
    }

    writeTemperature(data = null) {
        let tempText = "[TEMPERATURE]\n";

        if (!data) {
            data = this.temperature;
        }

        switch (data.type) {
            case "TIMESERIES":
                tempText += `TIMESERIES ${data.tseries}\n`;
                break;
            case "FILE":
                tempText += `FILE "${data.file.name}"`;
                if (data.file.start) {
                    tempText += ` ${data.file.start}`;
                }
                if (data.file.units) {
                    tempText += ` ${data.file.units}`;
                }
                tempText += `\n`;
                break;
        }

        if (data.windspeed.type === "MONTHLY") {
            tempText += `WINDSPEED MONTHLY ${data.windspeed.values.join(" ")}\n`;
        } else if (data.windspeed.type === "FILE") {
            tempText += `WINDSPEED FILE\n`;
        }

        if (data.snowmelt.stemp !== null) {
            tempText += `SNOWMELT ${data.snowmelt.stemp} ${data.snowmelt.atiwt} ${data.snowmelt.rnm} ${data.snowmelt.elev} ${data.snowmelt.lat} ${data.snowmelt.dtlong}\n`;
        }

        if (data.adc.impervious.length) {
            tempText += `ADC IMPERVIOUS ${data.adc.impervious.join(" ")}\n`;
        }

        if (data.adc.pervious.length) {
            tempText += `ADC PERVIOUS ${data.adc.pervious.join(" ")}\n`;
        }

        return tempText;
    }

    readAdjustments(rawAdjustments) {
        let adjustments = {
            temperature: [],
            evaporation: [],
            rainfall: [],
            conductivity: []
        };

        const lines = rawAdjustments.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);

                // Parse each keyword and assign the corresponding values
                switch (_line[0]) {
                    case "TEMPERATURE":
                        adjustments.temperature = _line.slice(1).map(parseFloat);
                        break;
                    case "EVAPORATION":
                        adjustments.evaporation = _line.slice(1).map(parseFloat);
                        break;
                    case "RAINFALL":
                        adjustments.rainfall = _line.slice(1).map(parseFloat);
                        break;
                    case "CONDUCTIVITY":
                        adjustments.conductivity = _line.slice(1).map(parseFloat);
                        break;
                }
            }
        }

        this.model.adjustments = adjustments;
    }

    writeAdjustments(data = null) {
        let adjText = "[ADJUSTMENTS]\n";

        if (!data) {
            data = this.adjustments;
        }

        if (data.temperature.length) {
            adjText += `TEMPERATURE ${data.temperature.join(" ")}\n`;
        }

        if (data.evaporation.length) {
            adjText += `EVAPORATION ${data.evaporation.join(" ")}\n`;
        }

        if (data.rainfall.length) {
            adjText += `RAINFALL ${data.rainfall.join(" ")}\n`;
        }

        if (data.conductivity.length) {
            adjText += `CONDUCTIVITY ${data.conductivity.join(" ")}\n`;
        }

        return adjText;
    }

    readSubcatchments(rawSubcatchments) {
        let subcatchments = [];

        const lines = rawSubcatchments.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);

                if (_line.length >= 7) {
                    let subcatchment = {
                        name: _line[0],          // Subcatchment Name
                        rgage: _line[1],         // Rain Gage
                        outID: _line[2],         // Outlet ID
                        area: parseFloat(_line[3]), // Area
                        percImperv: parseFloat(_line[4]), // % Impervious
                        width: parseFloat(_line[5]),  // Width
                        slope: parseFloat(_line[6]),  // Slope
                        clength: _line[7] ? parseFloat(_line[7]) : 0, // Curb Length, default 0
                        spack: _line[8] || null  // Optional Snow Pack
                    };

                    subcatchments.push(subcatchment);
                }
            }
        }

        this.subcatchments = subcatchments;
    }

    writeSubcatchments(data = null) {
        let subText = "[SUBCATCHMENTS]\n";

        if (!data) {
            data = this.model.subcatchments;
        }

        for (let sub of data) {
            let subLine = `${sub.name} ${sub.rgage} ${sub.outID} ${sub.area} ${sub.percImperv} ${sub.width} ${sub.slope}`;

            // Append clength if available, otherwise default to 0
            subLine += ` ${sub.clength !== undefined ? sub.clength : 0}`;

            // Append optional snow pack if available
            if (sub.spack) {
                subLine += ` ${sub.spack}`;
            }

            subText += subLine + "\n";
        }

        return subText;
    }

    readSubareas(rawSubareas) {
        let subareas = [];

        const lines = rawSubareas.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);

                if (_line.length >= 7) {
                    let subarea = {
                        subcat: _line[0],            // Subcatchment Name
                        nimp: parseFloat(_line[1]), // Manning's n for impervious area
                        nperv: parseFloat(_line[2]),// Manning's n for pervious area
                        simp: parseFloat(_line[3]), // Depression storage for impervious area
                        sperv: parseFloat(_line[4]),// Depression storage for pervious area
                        percZero: parseFloat(_line[5]), // % Impervious with no depression storage
                        routeTo: _line[6],          // Routing option: IMPERVIOUS, PERVIOUS, or OUTLET
                        percRouted: _line[7] ? parseFloat(_line[7]) : 100 // % Routed, default 100
                    };

                    subareas.push(subarea);
                }
            }
        }

        this.model.subareas = subareas;
    }

    writeSubareas(data = null) {
        let subText = "[SUBAREAS]\n";

        if (!data) {
            data = this.model.subareas;
        }

        for (let sub of data) {
            let subLine = `${sub.subcat} ${sub.nimp} ${sub.nperv} ${sub.simp} ${sub.sperv} ${sub.percZero} ${sub.routeTo}`;

            // Append the percentage routed if available, otherwise default to 100
            subLine += ` ${sub.percRouted !== undefined ? sub.percRouted : 100}`;

            subText += subLine + "\n";
        }

        return subText;
    }

    readInfiltration(rawInfiltration) {
        let infiltrations = [];

        const lines = rawInfiltration.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);

                if (_line.length >= 4) {
                    let infiltration = {
                        subcat: _line[0],  // Subcatchment Name
                        p1: parseFloat(_line[1]),  // Parameter 1
                        p2: parseFloat(_line[2]),  // Parameter 2
                        p3: parseFloat(_line[3]),  // Parameter 3
                        p4: _line[4] ? parseFloat(_line[4]) : null,  // Optional Parameter 4
                        p5: _line[5] ? parseFloat(_line[5]) : null,  // Optional Parameter 5
                        method: _line[6] || null  // Infiltration Method
                    };

                    infiltrations.push(infiltration);
                }
            }
        }

        this.model.infiltrations = infiltrations;
    }

    writeInfiltration(data = null) {
        let infilText = "[INFILTRATION]\n";

        if (!data) {
            data = this.model.infiltrations;
        }

        for (let infil of data) {
            let infilLine = `${infil.subcat} ${infil.p1} ${infil.p2} ${infil.p3}`;

            // Include optional parameters and method if available
            if (infil.p4 !== null) infilLine += ` ${infil.p4}`;
            if (infil.p5 !== null) infilLine += ` ${infil.p5}`;
            if (infil.method) infilLine += ` ${infil.method}`;

            infilText += infilLine + "\n";
        }

        return infilText;
    }

    readLIDControls(rawLIDControls) {
        let lidControls = [];
        let lines = rawLIDControls.split("\n");

        let currentLID = null;

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);

                // Check if the line defines a new LID Control
                if (_line.length === 2) {
                    // If we were building a LID, push it before starting a new one
                    if (currentLID) {
                        lidControls.push(currentLID);
                    }

                    currentLID = {
                        name: _line[0],
                        type: _line[1],
                        layers: []
                    };
                }
                // Add LID layer information to the current LID control
                else if (currentLID) {
                    let layerType = _line[1];
                    let parameters = _line.slice(2).map(x => parseFloat(x));

                    currentLID.layers.push({
                        layerType: layerType,
                        parameters: parameters
                    });
                }
            }
        }

        // Push the last LID control if present
        if (currentLID) {
            lidControls.push(currentLID);
        }

        this.model.lidControls = lidControls;
    }

    writeLIDControls(data = null) {
        let lidText = "[LID_CONTROLS]\n";

        if (!data) {
            data = this.model.lidControls;
        }

        for (let lid of data) {
            // Write LID control name and type
            lidText += `${lid.name} ${lid.type}\n`;

            // Write each layer's parameters
            for (let layer of lid.layers) {
                lidText += `${lid.name} ${layer.layerType}`;

                for (let param of layer.parameters) {
                    lidText += ` ${param}`;
                }

                lidText += "\n";
            }
        }

        return lidText;
    }

    readLIDUsage(rawLIDUsage) {
        let lidUsage = [];
        let lines = rawLIDUsage.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);

                if (_line.length >= 8) {
                    // Extract parameters based on the format
                    let subcat = _line[0];
                    let lid = _line[1];
                    let number = parseInt(_line[2], 10);
                    let area = parseFloat(_line[3]);
                    let width = parseFloat(_line[4]);
                    let initSat = parseFloat(_line[5]);
                    let fromImp = parseFloat(_line[6]);
                    let toPerv = parseInt(_line[7], 10);

                    // Optional parameters with defaults
                    let rptFile = _line[8] || '*';
                    let drainTo = _line[9] || '*';
                    let fromPerv = _line[10] ? parseFloat(_line[10]) : 0;

                    // Add LID usage to the list
                    lidUsage.push({
                        subcat: subcat,
                        lid: lid,
                        number: number,
                        area: area,
                        width: width,
                        initSat: initSat,
                        fromImp: fromImp,
                        toPerv: toPerv,
                        rptFile: rptFile,
                        drainTo: drainTo,
                        fromPerv: fromPerv,
                    });
                }
            }
        }

        this.model.lidUsage = lidUsage;
    }

    writeLIDUsage(data = null) {
        let usageText = "[LID_USAGE]\n";

        if (!data) {
            data = this.model.lidUsage;
        }

        for (let lid of data) {
            // Write LID usage details
            usageText += `${lid.subcat} ${lid.lid} ${lid.number} ${lid.area} ${lid.width} ${lid.initSat} ${lid.fromImp} ${lid.toPerv}`;

            // Include optional parameters if provided
            if (lid.rptFile !== '*') {
                usageText += ` ${lid.rptFile}`;
            }
            if (lid.drainTo !== '*') {
                usageText += ` ${lid.drainTo}`;
            }
            if (lid.fromPerv !== 0) {
                usageText += ` ${lid.fromPerv}`;
            }

            usageText += "\n";
        }

        return usageText;
    }

    readAquifers(rawAquifers) {
        let aquifers = [];
        let lines = rawAquifers.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);

                if (_line.length >= 13) {
                    // Extract parameters based on the format
                    let name = _line[0];
                    let por = parseFloat(_line[1]);
                    let wp = parseFloat(_line[2]);
                    let fc = parseFloat(_line[3]);
                    let ks = parseFloat(_line[4]);
                    let kslp = parseFloat(_line[5]);
                    let tslp = parseFloat(_line[6]);
                    let etu = parseFloat(_line[7]);
                    let ets = parseFloat(_line[8]);
                    let seep = parseFloat(_line[9]);
                    let ebot = parseFloat(_line[10]);
                    let egw = parseFloat(_line[11]);
                    let umc = parseFloat(_line[12]);

                    // Optional parameter for evaporation pattern
                    let epat = _line[13] || null;

                    // Add aquifer data to the list
                    aquifers.push({
                        name: name,
                        por: por,
                        wp: wp,
                        fc: fc,
                        ks: ks,
                        kslp: kslp,
                        tslp: tslp,
                        etu: etu,
                        ets: ets,
                        seep: seep,
                        ebot: ebot,
                        egw: egw,
                        umc: umc,
                        epat: epat,
                    });
                }
            }
        }

        this.model.aquifers = aquifers;
    }

    writeAquifers(data = null) {
        let aquifersText = "[AQUIFERS]\n";

        if (!data) {
            data = this.model.aquifers;
        }

        for (let aquifer of data) {
            // Write aquifer details
            aquifersText += `${aquifer.name} ${aquifer.por} ${aquifer.wp} ${aquifer.fc} ${aquifer.ks} ${aquifer.kslp} ${aquifer.tslp} ${aquifer.etu} ${aquifer.ets} ${aquifer.seep} ${aquifer.ebot} ${aquifer.egw} ${aquifer.umc}`;

            // Include optional evaporation pattern if provided
            if (aquifer.epat) {
                aquifersText += ` ${aquifer.epat}`;
            }

            aquifersText += "\n";
        }

        return aquifersText;
    }

    readGroundwater(rawGroundwater) {
        let groundwaterData = [];
        let lines = rawGroundwater.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);

                if (_line.length >= 9) {
                    // Extract parameters based on the format
                    let subcat = _line[0];
                    let aquifer = _line[1];
                    let node = _line[2];
                    let esurf = parseFloat(_line[3]);
                    let a1 = parseFloat(_line[4]);
                    let b1 = parseFloat(_line[5]);
                    let a2 = parseFloat(_line[6]);
                    let b2 = parseFloat(_line[7]);
                    let a3 = parseFloat(_line[8]);
                    let dsw = parseFloat(_line[9]);
                    let egwt = _line[10] !== '*' ? parseFloat(_line[10]) : null;
                    let ebot = _line[11] ? parseFloat(_line[11]) : null;
                    let egw = _line[12] ? parseFloat(_line[12]) : null;
                    let umc = _line[13] ? parseFloat(_line[13]) : null;

                    groundwaterData.push({
                        subcat: subcat,
                        aquifer: aquifer,
                        node: node,
                        esurf: esurf,
                        a1: a1,
                        b1: b1,
                        a2: a2,
                        b2: b2,
                        a3: a3,
                        dsw: dsw,
                        egwt: egwt,
                        ebot: ebot,
                        egw: egw,
                        umc: umc,
                    });
                }
            }
        }

        this.model.groundwater = groundwaterData;
    }

    writeGroundwater(data = null) {
        let groundwaterText = "[GROUNDWATER]\n";

        if (!data) {
            data = this.model.groundwater;
        }

        for (let gw of data) {
            // Write groundwater data
            groundwaterText += `${gw.subcat} ${gw.aquifer} ${gw.node} ${gw.esurf} ${gw.a1} ${gw.b1} ${gw.a2} ${gw.b2} ${gw.a3} ${gw.dsw}`;

            // Include optional parameters if provided
            if (gw.egwt !== null) groundwaterText += ` ${gw.egwt}`;
            if (gw.ebot !== null) groundwaterText += ` ${gw.ebot}`;
            if (gw.egw !== null) groundwaterText += ` ${gw.egw}`;
            if (gw.umc !== null) groundwaterText += ` ${gw.umc}`;

            groundwaterText += "\n";
        }

        return groundwaterText;
    }

    readGWF(rawGWF) {
        let gwfData = [];
        let lines = rawGWF.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);

                if (_line.length >= 3) {
                    // Extract parameters based on the format
                    let subcat = _line[0];
                    let type = _line[1];
                    let expr = _line.slice(2).join(" ");

                    gwfData.push({
                        subcat: subcat,
                        type: type,
                        expr: expr,
                    });
                }
            }
        }

        this.model.gwf = gwfData;
    }

    writeGWF(data = null) {
        let gwfText = "[GWF]\n";

        if (!data) {
            data = this.model.gwf;
        }

        for (let gwf of data) {
            // Write groundwater flow data
            gwfText += `${gwf.subcat} ${gwf.type} ${gwf.expr}\n`;
        }

        return gwfText;
    }

    readSNOWPACKS(rawSNOWPACKS) {
        let snowpacks = [];
        let lines = rawSNOWPACKS.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);

                if (_line.length > 1) {
                    let name = _line[0];
                    let type = _line[1];
                    let params = _line.slice(2).map(parseFloat);

                    snowpacks.push({
                        name: name,
                        type: type,
                        params: params,
                    });
                }
            }
        }

        this.model.snowpacks = snowpacks;
    }

    writeSNOWPACKS(data = null) {
        let snowpacksText = "[SNOWPACKS]\n";

        if (!data) {
            data = this.model.snowpacks;
        }

        for (let snowpack of data) {
            let params = snowpack.params.join(" ");
            snowpacksText += `${snowpack.name} ${snowpack.type} ${params}\n`;
        }

        return snowpacksText;
    }

    readJUNCTIONS(rawJUNCTIONS) {
        let junctions = [];
        let lines = rawJUNCTIONS.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);

                if (_line.length > 1) {
                    let name = _line[0];
                    let elev = parseFloat(_line[1]);
                    let ymax = _line.length > 2 ? parseFloat(_line[2]) : 0;
                    let y0 = _line.length > 3 ? parseFloat(_line[3]) : 0;
                    let ysur = _line.length > 4 ? parseFloat(_line[4]) : 0;
                    let apond = _line.length > 5 ? parseFloat(_line[5]) : 0;

                    junctions.push({
                        name: name,
                        elev: elev,
                        ymax: ymax,
                        y0: y0,
                        ysur: ysur,
                        apond: apond,
                    });
                }
            }
        }

        this.model.junctions = junctions;
    }

    writeJUNCTIONS(data = null) {
        let junctionsText = "[JUNCTIONS]\n";

        if (!data) {
            data = this.model.junctions;
        }

        for (let junction of data) {
            junctionsText += `${junction.name} ${junction.elev} ${junction.ymax} ${junction.y0} ${junction.ysur} ${junction.apond}\n`;
        }

        return junctionsText;
    }

    readOUTFALLS(rawOUTFALLS) {
        let outfalls = [];
        let lines = rawOUTFALLS.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let name = _line[0];
                let elev = parseFloat(_line[1]);
                let type = _line[2] || "FREE";
                let gated = _line.includes("Gated") ? "YES" : "NO";
                let routeTo = _line.includes("RouteTo") ? _line[_line.indexOf("RouteTo") + 1] : null;
                let stage = null;
                let tcurve = null;
                let tseries = null;

                if (type === "FIXED") {
                    stage = parseFloat(_line[3]);
                } else if (type === "TIDAL") {
                    tcurve = _line[3];
                } else if (type === "TIMESERIES") {
                    tseries = _line[3];
                }

                outfalls.push({
                    name: name,
                    elev: elev,
                    type: type,
                    stage: stage,
                    tcurve: tcurve,
                    tseries: tseries,
                    gated: gated,
                    routeTo: routeTo
                });
            }
        }

        this.model.outfalls = outfalls;
    }

    writeOUTFALLS(data = null) {
        let outfallsText = "[OUTFALLS]\n";

        if (!data) {
            data = this.model.outfalls;
        }

        for (let outfall of data) {
            let line = `${outfall.name} ${outfall.elev} ${outfall.type}`;
            if (outfall.type === "FIXED") {
                line += ` ${outfall.stage}`;
            } else if (outfall.type === "TIDAL") {
                line += ` ${outfall.tcurve}`;
            } else if (outfall.type === "TIMESERIES") {
                line += ` ${outfall.tseries}`;
            }
            if (outfall.gated === "YES") {
                line += ` Gated`;
            }
            if (outfall.routeTo) {
                line += ` RouteTo ${outfall.routeTo}`;
            }
            outfallsText += line + "\n";
        }

        return outfallsText;
    }

    readDIVIDERS(rawDIVIDERS) {
        let dividers = [];
        let lines = rawDIVIDERS.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let name = _line[0];
                let elev = parseFloat(_line[1]);
                let divLink = _line[2];
                let type = _line[3];
                let qmin = null;
                let dcurve = null;
                let ht = null;
                let cd = null;
                let ymax = _line.includes("Ymax") ? parseFloat(_line[_line.indexOf("Ymax") + 1]) : 0;
                let y0 = _line.includes("Y0") ? parseFloat(_line[_line.indexOf("Y0") + 1]) : 0;
                let ysur = _line.includes("Ysur") ? parseFloat(_line[_line.indexOf("Ysur") + 1]) : 0;
                let apond = _line.includes("Apond") ? parseFloat(_line[_line.indexOf("Apond") + 1]) : 0;

                if (type === "CUTOFF") {
                    qmin = parseFloat(_line[4]);
                } else if (type === "TABULAR") {
                    dcurve = _line[4];
                } else if (type === "WEIR") {
                    qmin = parseFloat(_line[4]);
                    ht = parseFloat(_line[5]);
                    cd = parseFloat(_line[6]);
                }

                dividers.push({
                    name: name,
                    elev: elev,
                    divLink: divLink,
                    type: type,
                    qmin: qmin,
                    dcurve: dcurve,
                    ht: ht,
                    cd: cd,
                    ymax: ymax,
                    y0: y0,
                    ysur: ysur,
                    apond: apond
                });
            }
        }

        this.model.dividers = dividers;
    }

    writeDIVIDERS(data = null) {
        let dividersText = "[DIVIDERS]\n";

        if (!data) {
            data = this.model.dividers;
        }

        for (let divider of data) {
            let line = `${divider.name} ${divider.elev} ${divider.divLink} ${divider.type}`;
            if (divider.type === "CUTOFF") {
                line += ` ${divider.qmin}`;
            } else if (divider.type === "TABULAR") {
                line += ` ${divider.dcurve}`;
            } else if (divider.type === "WEIR") {
                line += ` ${divider.qmin} ${divider.ht} ${divider.cd}`;
            }
            if (divider.ymax > 0) {
                line += ` Ymax ${divider.ymax}`;
            }
            if (divider.y0 > 0) {
                line += ` Y0 ${divider.y0}`;
            }
            if (divider.ysur > 0) {
                line += ` Ysur ${divider.ysur}`;
            }
            if (divider.apond > 0) {
                line += ` Apond ${divider.apond}`;
            }
            dividersText += line + "\n";
        }

        return dividersText;
    }

    readSTORAGE(rawSTORAGE) {
        let storageNodes = [];
        let lines = rawSTORAGE.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let name = _line[0];
                let elev = parseFloat(_line[1]);
                let ymax = parseFloat(_line[2]);
                let y0 = parseFloat(_line[3]);
                let type = _line[4];
                let aCurve = null;
                let a1 = null;
                let a2 = null;
                let a0 = null;
                let shape = null;
                let l = null;
                let w = null;
                let z = null;
                let ysur = _line.includes("Ysur") ? parseFloat(_line[_line.indexOf("Ysur") + 1]) : 0;
                let fevap = _line.includes("Fevap") ? parseFloat(_line[_line.indexOf("Fevap") + 1]) : 0;
                let psi = _line.includes("Psi") ? parseFloat(_line[_line.indexOf("Psi") + 1]) : null;
                let ksat = _line.includes("Ksat") ? parseFloat(_line[_line.indexOf("Ksat") + 1]) : null;
                let imd = _line.includes("IMD") ? parseFloat(_line[_line.indexOf("IMD") + 1]) : null;

                if (type === "TABULAR") {
                    aCurve = _line[5];
                } else if (type === "FUNCTIONAL") {
                    a1 = parseFloat(_line[5]);
                    a2 = parseFloat(_line[6]);
                    a0 = parseFloat(_line[7]);
                } else if (type === "Shape") {
                    shape = _line[4];
                    l = parseFloat(_line[5]);
                    w = parseFloat(_line[6]);
                    z = parseFloat(_line[7]);
                }

                storageNodes.push({
                    name: name,
                    elev: elev,
                    ymax: ymax,
                    y0: y0,
                    type: type,
                    aCurve: aCurve,
                    a1: a1,
                    a2: a2,
                    a0: a0,
                    shape: shape,
                    l: l,
                    w: w,
                    z: z,
                    ysur: ysur,
                    fevap: fevap,
                    psi: psi,
                    ksat: ksat,
                    imd: imd
                });
            }
        }

        this.model.storageNodes = storageNodes;
    }

    writeSTORAGE(data = null) {
        let storageText = "[STORAGE]\n";

        if (!data) {
            data = this.model.storageNodes;
        }

        for (let node of data) {
            let line = `${node.name} ${node.elev} ${node.ymax} ${node.y0}`;
            if (node.type === "TABULAR") {
                line += ` TABULAR ${node.aCurve}`;
            } else if (node.type === "FUNCTIONAL") {
                line += ` FUNCTIONAL ${node.a1} ${node.a2} ${node.a0}`;
            } else if (node.type === "CYLINDRICAL" || node.type === "CONICAL" || node.type === "PARABOLOID" || node.type === "PYRAMIDAL") {
                line += ` ${node.type} ${node.l} ${node.w} ${node.z}`;
            }
            if (node.ysur > 0) {
                line += ` Ysur ${node.ysur}`;
            }
            if (node.fevap > 0) {
                line += ` Fevap ${node.fevap}`;
            }
            if (node.psi !== null) {
                line += ` Psi ${node.psi}`;
            }
            if (node.ksat !== null) {
                line += ` Ksat ${node.ksat}`;
            }
            if (node.imd !== null) {
                line += ` IMD ${node.imd}`;
            }
            storageText += line + "\n";
        }

        return storageText;
    }

    readCONDUITS(rawCONDUITS) {
        let conduits = [];
        let lines = rawCONDUITS.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let name = _line[0];
                let node1 = _line[1];
                let node2 = _line[2];
                let length = parseFloat(_line[3]);
                let n = parseFloat(_line[4]);
                let z1 = parseFloat(_line[5]);
                let z2 = parseFloat(_line[6]);
                let q0 = _line.length > 7 ? parseFloat(_line[7]) : 0;
                let qmax = _line.length > 8 ? parseFloat(_line[8]) : null;

                conduits.push({
                    name: name,
                    node1: node1,
                    node2: node2,
                    length: length,
                    n: n,
                    z1: z1,
                    z2: z2,
                    q0: q0,
                    qmax: qmax
                });
            }
        }

        this.model.conduits = conduits;
    }

    writeCONDUITS(data = null) {
        let conduitsText = "[CONDUITS]\n";

        if (!data) {
            data = this.model.conduits;
        }

        for (let conduit of data) {
            let line = `${conduit.name} ${conduit.node1} ${conduit.node2} ${conduit.length} ${conduit.n} ${conduit.z1} ${conduit.z2}`;
            if (conduit.q0 > 0) {
                line += ` ${conduit.q0}`;
            }
            if (conduit.qmax !== null) {
                line += ` ${conduit.qmax}`;
            }
            conduitsText += line + "\n";
        }

        return conduitsText;
    }

    readPUMPS(rawPUMPS) {
        let pumps = [];
        let lines = rawPUMPS.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let name = _line[0];
                let node1 = _line[1];
                let node2 = _line[2];
                let pcurve = _line[3];
                let status = _line.length > 4 ? _line[4] : "ON";
                let startup = _line.length > 5 ? parseFloat(_line[5]) : 0;
                let shutoff = _line.length > 6 ? parseFloat(_line[6]) : 0;

                pumps.push({
                    name: name,
                    node1: node1,
                    node2: node2,
                    pcurve: pcurve,
                    status: status,
                    startup: startup,
                    shutoff: shutoff
                });
            }
        }

        this.model.pumps = pumps;
    }

    writePUMPS(data = null) {
        let pumpsText = "[PUMPS]\n";

        if (!data) {
            data = this.model.pumps;
        }

        for (let pump of data) {
            let line = `${pump.name} ${pump.node1} ${pump.node2} ${pump.pcurve}`;
            if (pump.status !== "ON") {
                line += ` ${pump.status}`;
            }
            if (pump.startup > 0) {
                line += ` ${pump.startup}`;
            }
            if (pump.shutoff > 0) {
                line += ` ${pump.shutoff}`;
            }
            pumpsText += line + "\n";
        }

        return pumpsText;
    }

    readORIFICES(rawORIFICES) {
        let orifices = [];
        let lines = rawORIFICES.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let name = _line[0];
                let node1 = _line[1];
                let node2 = _line[2];
                let type = _line[3];
                let offset = parseFloat(_line[4]);
                let cd = parseFloat(_line[5]);
                let gated = _line.length > 6 ? _line[6] : "NO";
                let orate = _line.length > 7 ? parseFloat(_line[7]) : 0;

                orifices.push({
                    name: name,
                    node1: node1,
                    node2: node2,
                    type: type,
                    offset: offset,
                    cd: cd,
                    gated: gated,
                    orate: orate
                });
            }
        }

        this.model.orifices = orifices;
    }

    writeORIFICES(data = null) {
        let orificesText = "[ORIFICES]\n";

        if (!data) {
            data = this.model.orifices;
        }

        for (let orifice of data) {
            let line = `${orifice.name} ${orifice.node1} ${orifice.node2} ${orifice.type} ${orifice.offset} ${orifice.cd}`;
            if (orifice.gated !== "NO") {
                line += ` ${orifice.gated}`;
            }
            if (orifice.orate > 0) {
                line += ` ${orifice.orate}`;
            }
            orificesText += line + "\n";
        }

        return orificesText;
    }

    readWEIRS(rawWEIRS) {
        let weirs = [];
        let lines = rawWEIRS.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let name = _line[0];
                let node1 = _line[1];
                let node2 = _line[2];
                let type = _line[3];
                let crstHt = parseFloat(_line[4]);
                let cd = parseFloat(_line[5]);
                let gated = _line.length > 6 ? _line[6] : "NO";
                let ec = _line.length > 7 ? parseInt(_line[7]) : 0;
                let cd2 = _line.length > 8 ? parseFloat(_line[8]) : cd;
                let sur = _line.length > 9 ? _line[9] : "YES";
                let width = _line.length > 10 ? parseFloat(_line[10]) : null;
                let surf = _line.length > 11 ? _line[11] : null;

                weirs.push({
                    name: name,
                    node1: node1,
                    node2: node2,
                    type: type,
                    crstHt: crstHt,
                    cd: cd,
                    gated: gated,
                    ec: ec,
                    cd2: cd2,
                    sur: sur,
                    width: width,
                    surf: surf
                });
            }
        }

        this.model.weirs = weirs;
    }

    writeWEIRS(data = null) {
        let weirsText = "[WEIRS]\n";

        if (!data) {
            data = this.model.weirs;
        }

        for (let weir of data) {
            let line = `${weir.name} ${weir.node1} ${weir.node2} ${weir.type} ${weir.crstHt} ${weir.cd}`;
            if (weir.gated !== "NO") {
                line += ` ${weir.gated}`;
            }
            if (weir.ec > 0) {
                line += ` ${weir.ec}`;
            }
            if (weir.cd2 !== weir.cd) {
                line += ` ${weir.cd2}`;
            }
            if (weir.sur !== "YES") {
                line += ` ${weir.sur}`;
            }
            if (weir.width !== null) {
                line += ` ${weir.width}`;
            }
            if (weir.surf !== null) {
                line += ` ${weir.surf}`;
            }
            weirsText += line + "\n";
        }

        return weirsText;
    }

    readOUTLETS(rawOUTLETS) {
        let outlets = [];
        let lines = rawOUTLETS.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let name = _line[0];
                let node1 = _line[1];
                let node2 = _line[2];
                let offset = parseFloat(_line[3]);
                let type = _line[4];
                let qcurveOrC1 = _line[5];
                let gated = _line.length > 6 ? _line[6] : "NO";

                let outlet = {
                    name: name,
                    node1: node1,
                    node2: node2,
                    offset: offset,
                    gated: gated
                };

                if (type === "TABULAR/DEPTH" || type === "TABULAR/HEAD") {
                    outlet.qcurve = qcurveOrC1;
                    outlet.type = type;
                } else if (type === "FUNCTIONAL/DEPTH" || type === "FUNCTIONAL/HEAD") {
                    outlet.c1 = parseFloat(qcurveOrC1);
                    outlet.c2 = parseFloat(_line[6]);
                    outlet.type = type;
                }

                outlets.push(outlet);
            }
        }

        this.model.outlets = outlets;
    }

    writeOUTLETS(data = null) {
        let outletsText = "[OUTLETS]\n";

        if (!data) {
            data = this.model.outlets;
        }

        for (let outlet of data) {
            let line = `${outlet.name} ${outlet.node1} ${outlet.node2} ${outlet.offset} ${outlet.type}`;

            if (outlet.type === "TABULAR/DEPTH" || outlet.type === "TABULAR/HEAD") {
                line += ` ${outlet.qcurve}`;
            } else if (outlet.type === "FUNCTIONAL/DEPTH" || outlet.type === "FUNCTIONAL/HEAD") {
                line += ` ${outlet.c1} ${outlet.c2}`;
            }

            if (outlet.gated !== "NO") {
                line += ` ${outlet.gated}`;
            }

            outletsText += line + "\n";
        }

        return outletsText;
    }

    readXSECTIONS(rawXSECTIONS) {
        let xsections = [];
        let lines = rawXSECTIONS.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let link = _line[0];
                let shape = _line[1];
                let geom1 = parseFloat(_line[2]);
                let geom2 = _line[3] ? parseFloat(_line[3]) : undefined;
                let geom3 = _line[4] ? parseFloat(_line[4]) : undefined;
                let geom4 = _line[5] ? parseFloat(_line[5]) : undefined;
                let barrels = _line[6] ? parseInt(_line[6]) : undefined;
                let culvert = _line[7] || undefined;
                let curve = _line[8] || undefined;
                let tsect = _line[9] || undefined;
                let street = _line[10] || undefined;

                let xsection = {
                    link: link,
                    shape: shape,
                    geom1: geom1,
                    geom2: geom2,
                    geom3: geom3,
                    geom4: geom4,
                    barrels: barrels,
                    culvert: culvert,
                    curve: curve,
                    tsect: tsect,
                    street: street
                };

                xsections.push(xsection);
            }
        }

        this.model.xsections = xsections;
    }

    writeXSECTIONS(data = null) {
        let xsectionsText = "[XSECTIONS]\n";

        if (!data) {
            data = this.model.xsections;
        }

        for (let xsection of data) {
            let line = `${xsection.link} ${xsection.shape} ${xsection.geom1}`;

            if (xsection.geom2 !== undefined) line += ` ${xsection.geom2}`;
            if (xsection.geom3 !== undefined) line += ` ${xsection.geom3}`;
            if (xsection.geom4 !== undefined) line += ` ${xsection.geom4}`;
            if (xsection.barrels !== undefined) line += ` ${xsection.barrels}`;
            if (xsection.culvert) line += ` ${xsection.culvert}`;
            if (xsection.curve) line += ` ${xsection.curve}`;
            if (xsection.tsect) line += ` ${xsection.tsect}`;
            if (xsection.street) line += ` ${xsection.street}`;

            xsectionsText += line + "\n";
        }

        return xsectionsText;
    }

    readTRANSECTS(rawTRANSECTS) {
        let transects = [];
        let lines = rawTRANSECTS.split("\n");
        let currentTransect = null;

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);

                if (_line[0] === 'NC') {
                    if (currentTransect) {
                        transects.push(currentTransect);
                    }
                    currentTransect = {
                        type: 'NC',
                        Nleft: parseFloat(_line[1]),
                        Nright: parseFloat(_line[2]),
                        Nchanl: parseFloat(_line[3]),
                        sections: []
                    };
                } else if (_line[0] === 'X1') {
                    if (currentTransect) {
                        currentTransect.X1 = {
                            name: _line[1],
                            Nsta: parseInt(_line[2]),
                            Xleft: parseFloat(_line[3]),
                            Xright: parseFloat(_line[4]),
                            Lfactor: _line[5] ? parseFloat(_line[5]) : undefined,
                            Wfactor: _line[6] ? parseFloat(_line[6]) : undefined,
                            Eoffset: _line[7] ? parseFloat(_line[7]) : undefined
                        };
                    }
                } else if (_line[0] === 'GR') {
                    if (currentTransect) {
                        let stations = [];
                        for (let i = 1; i < _line.length; i += 2) {
                            stations.push({
                                Elev: parseFloat(_line[i]),
                                Station: parseFloat(_line[i + 1])
                            });
                        }
                        currentTransect.GR = stations;
                    }
                }
            }
        }

        if (currentTransect) {
            transects.push(currentTransect);
        }

        this.model.transects = transects;
    }

    writeTRANSECTS(data = null) {
        let transectsText = "[TRANSECTS]\n";

        if (!data) {
            data = this.model.transects;
        }

        for (let transect of data) {
            if (transect.type === 'NC') {
                transectsText += `NC ${transect.Nleft} ${transect.Nright} ${transect.Nchanl}\n`;
            }

            if (transect.X1) {
                let line = `X1 ${transect.X1.name} ${transect.X1.Nsta} ${transect.X1.Xleft} ${transect.X1.Xright}`;
                if (transect.X1.Lfactor !== undefined) line += ` ${transect.X1.Lfactor}`;
                if (transect.X1.Wfactor !== undefined) line += ` ${transect.X1.Wfactor}`;
                if (transect.X1.Eoffset !== undefined) line += ` ${transect.X1.Eoffset}`;
                transectsText += line + "\n";
            }

            if (transect.GR) {
                let line = "GR";
                for (let station of transect.GR) {
                    line += ` ${station.Elev} ${station.Station}`;
                }
                transectsText += line + "\n";
            }
        }

        return transectsText;
    }

    readSTREETS(rawSTREETS) {
        let streets = [];
        let lines = rawSTREETS.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let name = _line[0];
                let street = {
                    name: name,
                    Tcrown: parseFloat(_line[1]),
                    Hcurb: parseFloat(_line[2]),
                    Sx: parseFloat(_line[3]),
                    nRoad: parseFloat(_line[4]),
                    a: _line[5] ? parseFloat(_line[5]) : 0,
                    W: _line[6] ? parseFloat(_line[6]) : 0,
                    Sides: _line[7] ? parseInt(_line[7]) : 2,
                    Tback: _line[8] ? parseFloat(_line[8]) : 0,
                    Sback: _line[9] ? parseFloat(_line[9]) : 0,
                    nBack: _line[10] ? parseFloat(_line[10]) : 0
                };
                streets.push(street);
            }
        }

        this.model.streets = streets;
    }

    writeSTREETS(data = null) {
        let streetsText = "[STREETS]\n";

        if (!data) {
            data = this.model.streets;
        }

        for (let street of data) {
            let line = `${street.name} ${street.Tcrown} ${street.Hcurb} ${street.Sx} ${street.nRoad}`;

            if (street.a !== 0) line += ` ${street.a}`;
            if (street.W !== 0) line += ` ${street.W}`;
            if (street.Sides !== 2) line += ` ${street.Sides}`;
            if (street.Tback !== 0) line += ` ${street.Tback}`;
            if (street.Sback !== 0) line += ` ${street.Sback}`;
            if (street.nBack !== 0) line += ` ${street.nBack}`;

            streetsText += line + "\n";
        }

        return streetsText;
    }

    readINLETS(rawINLETS) {
        let inlets = [];
        let lines = rawINLETS.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let name = _line[0];
                let type = _line[1];
                let inlet = { name: name, type: type };

                switch (type) {
                    case 'GRATE':
                    case 'DROP_GRATE':
                        inlet.length = parseFloat(_line[2]);
                        inlet.width = parseFloat(_line[3]);
                        inlet.grateType = _line[4];
                        if (inlet.grateType === 'GENERIC') {
                            inlet.Aopen = parseFloat(_line[5]);
                            inlet.Vsplash = parseFloat(_line[6]);
                        }
                        break;

                    case 'CURB':
                    case 'DROP_CURB':
                        inlet.length = parseFloat(_line[2]);
                        inlet.height = parseFloat(_line[3]);
                        if (_line[4]) {
                            inlet.throat = _line[4];
                        }
                        break;

                    case 'SLOTTED':
                        inlet.length = parseFloat(_line[2]);
                        inlet.width = parseFloat(_line[3]);
                        break;

                    case 'CUSTOM':
                        inlet.Dcurve = _line[2];
                        inlet.Rcurve = _line[3];
                        break;
                }
                inlets.push(inlet);
            }
        }

        this.model.inlets = inlets;
    }

    writeINLETS(data = null) {
        let inletsText = "[INLETS]\n";

        if (!data) {
            data = this.model.inlets;
        }

        for (let inlet of data) {
            let line = `${inlet.name} ${inlet.type}`;

            switch (inlet.type) {
                case 'GRATE':
                case 'DROP_GRATE':
                    line += ` ${inlet.length} ${inlet.width} ${inlet.grateType}`;
                    if (inlet.grateType === 'GENERIC') {
                        line += ` ${inlet.Aopen} ${inlet.Vsplash}`;
                    }
                    break;

                case 'CURB':
                case 'DROP_CURB':
                    line += ` ${inlet.length} ${inlet.height}`;
                    if (inlet.throat) {
                        line += ` ${inlet.throat}`;
                    }
                    break;

                case 'SLOTTED':
                    line += ` ${inlet.length} ${inlet.width}`;
                    break;

                case 'CUSTOM':
                    line += ` ${inlet.Dcurve} ${inlet.Rcurve}`;
                    break;
            }
            inletsText += line + "\n";
        }

        return inletsText;
    }

    readINLET_USAGE(rawINLET_USAGE) {
        let inletUsage = [];
        let lines = rawINLET_USAGE.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let conduit = _line[0];
                let inlet = _line[1];
                let node = _line[2];
                let number = parseInt(_line[3]) || 1; // Default to 1 if not specified
                let clogging = parseFloat(_line[4]) || 0; // Default to 0 if not specified
                let qmax = parseFloat(_line[5]) || 0; // Default to 0 if not specified
                let aLocal = parseFloat(_line[6]) || 0; // Default to 0 if not specified
                let wLocal = parseFloat(_line[7]) || 0; // Default to 0 if not specified
                let placement = _line[8] || "AUTOMATIC"; // Default to AUTOMATIC if not specified

                let usage = {
                    conduit: conduit,
                    inlet: inlet,
                    node: node,
                    number: number,
                    clogging: clogging,
                    qmax: qmax,
                    aLocal: aLocal,
                    wLocal: wLocal,
                    placement: placement
                };
                inletUsage.push(usage);
            }
        }

        this.model.inletUsage = inletUsage;
    }

    writeINLET_USAGE(data = null) {
        let inletUsageText = "[INLET_USAGE]\n";

        if (!data) {
            data = this.model.inletUsage;
        }

        for (let usage of data) {
            let line = `${usage.conduit} ${usage.inlet} ${usage.node} ${usage.number} ${usage.clogging} ${usage.qmax} ${usage.aLocal} ${usage.wLocal} ${usage.placement}`;
            inletUsageText += line + "\n";
        }

        return inletUsageText;
    }

    readLOSSES(rawLOSSES) {
        let losses = [];
        let lines = rawLOSSES.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let conduit = _line[0];
                let kentry = parseFloat(_line[1]);
                let kexit = parseFloat(_line[2]);
                let kavg = parseFloat(_line[3]);
                let flap = _line[4] || "NO"; // Default to NO if not specified
                let seepage = parseFloat(_line[5]) || 0; // Default to 0 if not specified

                let loss = {
                    conduit: conduit,
                    kentry: kentry,
                    kexit: kexit,
                    kavg: kavg,
                    flap: flap,
                    seepage: seepage
                };
                losses.push(loss);
            }
        }

        this.model.losses = losses;
    }

    writeLOSSES(data = null) {
        let lossesText = "[LOSSES]\n";

        if (!data) {
            data = this.model.losses;
        }

        for (let loss of data) {
            let line = `${loss.conduit} ${loss.kentry} ${loss.kexit} ${loss.kavg} ${loss.flap} ${loss.seepage}`;
            lossesText += line + "\n";
        }

        return lossesText;
    }

    readPOLLUTANTS(rawPOLLUTANTS) {
        let pollutants = [];
        let lines = rawPOLLUTANTS.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let name = _line[0];
                let units = _line[1];
                let crain = parseFloat(_line[2]);
                let cgw = parseFloat(_line[3]);
                let cii = parseFloat(_line[4]);
                let kdecay = parseFloat(_line[5]);
                let sflag = _line[6] || "NO";
                let coPoll = _line[7] || "*";
                let coFract = parseFloat(_line[8]) || 0;
                let cdwf = parseFloat(_line[9]) || 0;
                let cinit = parseFloat(_line[10]) || 0;

                let pollutant = {
                    name: name,
                    units: units,
                    crain: crain,
                    cgw: cgw,
                    cii: cii,
                    kdecay: kdecay,
                    sflag: sflag,
                    coPoll: coPoll,
                    coFract: coFract,
                    cdwf: cdwf,
                    cinit: cinit
                };
                pollutants.push(pollutant);
            }
        }

        this.model.pollutants = pollutants;
    }

    writePOLLUTANTS(data = null) {
        let pollutantsText = "[POLLUTANTS]\n";

        if (!data) {
            data = this.model.pollutants;
        }

        for (let pollutant of data) {
            let line = `${pollutant.name} ${pollutant.units} ${pollutant.crain} ${pollutant.cgw} ${pollutant.cii} ${pollutant.kdecay} ${pollutant.sflag} ${pollutant.coPoll} ${pollutant.coFract} ${pollutant.cdwf} ${pollutant.cinit}`;
            pollutantsText += line + "\n";
        }

        return pollutantsText;
    }

    readLANDUSES(rawLANDUSES) {
        let landUses = [];
        let lines = rawLANDUSES.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let name = _line[0];
                let sweepInterval = parseFloat(_line[1]) || 0;
                let availability = parseFloat(_line[2]) || 0;
                let lastSweep = parseFloat(_line[3]) || 0;

                let landUse = {
                    name: name,
                    sweepInterval: sweepInterval,
                    availability: availability,
                    lastSweep: lastSweep
                };
                landUses.push(landUse);
            }
        }

        this.model.landUses = landUses;
    }

    writeLANDUSES(data = null) {
        let landUsesText = "[LANDUSES]\n";

        if (!data) {
            data = this.model.landUses;
        }

        for (let landUse of data) {
            let line = `${landUse.name} ${landUse.sweepInterval} ${landUse.availability} ${landUse.lastSweep}`;
            landUsesText += line + "\n";
        }

        return landUsesText;
    }

    readCOVERAGES(rawCOVERAGES) {
        let coverages = [];
        let lines = rawCOVERAGES.split("\n");

        let currentSubcat = null;

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let subcat = _line[0];

                if (subcat !== currentSubcat) {
                    currentSubcat = subcat;
                }

                for (let i = 1; i < _line.length; i += 2) {
                    let landuse = _line[i];
                    let percent = parseFloat(_line[i + 1]) || 0;

                    coverages.push({
                        subcatchment: currentSubcat,
                        landuse: landuse,
                        percent: percent
                    });
                }
            }
        }

        this.model.coverages = coverages;
    }

    writeCOVERAGES(data = null) {
        let coveragesText = "[COVERAGES]\n";

        if (!data) {
            data = this.model.coverages;
        }

        let subcatMap = new Map();

        for (let coverage of data) {
            if (!subcatMap.has(coverage.subcatchment)) {
                subcatMap.set(coverage.subcatchment, []);
            }
            subcatMap.get(coverage.subcatchment).push(`${coverage.landuse} ${coverage.percent}`);
        }

        for (let [subcatchment, landUses] of subcatMap) {
            coveragesText += `${subcatchment} ${landUses.join(' ')}\n`;
        }

        return coveragesText;
    }

    readLOADINGS(rawLOADINGS) {
        let loadings = [];
        let lines = rawLOADINGS.split("\n");

        let currentSubcat = null;

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let subcat = _line[0];

                if (subcat !== currentSubcat) {
                    currentSubcat = subcat;
                }

                for (let i = 1; i < _line.length; i += 2) {
                    let pollut = _line[i];
                    let initBuildup = parseFloat(_line[i + 1]) || 0;

                    loadings.push({
                        subcatchment: currentSubcat,
                        pollutant: pollut,
                        initBuildup: initBuildup
                    });
                }
            }
        }

        this.model.loadings = loadings;
    }

    writeLOADINGS(data = null) {
        let loadingsText = "[LOADINGS]\n";

        if (!data) {
            data = this.model.loadings;
        }

        let subcatMap = new Map();

        for (let loading of data) {
            if (!subcatMap.has(loading.subcatchment)) {
                subcatMap.set(loading.subcatchment, []);
            }
            subcatMap.get(loading.subcatchment).push(`${loading.pollutant} ${loading.initBuildup}`);
        }

        for (let [subcatchment, loadings] of subcatMap) {
            loadingsText += `${subcatchment} ${loadings.join(' ')}\n`;
        }

        return loadingsText;
    }

    readBUILDUP(rawBUILDUP) {
        let buildups = [];
        let lines = rawBUILDUP.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let landuse = _line[0];
                let pollutant = _line[1];
                let funcType = _line[2];
                let C1 = parseFloat(_line[3]);
                let C2 = parseFloat(_line[4]);
                let C3 = _line[5];
                let perUnit = _line[6];

                buildups.push({
                    landuse: landuse,
                    pollutant: pollutant,
                    funcType: funcType,
                    C1: C1,
                    C2: C2,
                    C3: C3,
                    perUnit: perUnit
                });
            }
        }

        this.model.buildups = buildups;
    }

    writeBUILDUP(data = null) {
        let buildupText = "[BUILDUP]\n";

        if (!data) {
            data = this.model.buildups;
        }

        for (let buildup of data) {
            buildupText += `${buildup.landuse} ${buildup.pollutant} ${buildup.funcType} ${buildup.C1} ${buildup.C2} ${buildup.C3} ${buildup.perUnit}\n`;
        }

        return buildupText;
    }

    readWASHOFF(rawWASHOFF) {
        let washoffList = [];
        let lines = rawWASHOFF.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let landuse = _line[0];
                let pollutant = _line[1];
                let funcType = _line[2];
                let C1 = parseFloat(_line[3]);
                let C2 = parseFloat(_line[4]);
                let sweepRmvl = parseFloat(_line[5]);
                let bmpRmvl = parseFloat(_line[6]);

                washoffList.push({
                    landuse: landuse,
                    pollutant: pollutant,
                    funcType: funcType,
                    C1: C1,
                    C2: C2,
                    sweepRmvl: sweepRmvl,
                    bmpRmvl: bmpRmvl
                });
            }
        }

        this.model.washoff = washoffList;
    }

    writeWASHOFF(data = null) {
        let washoffText = "[WASHOFF]\n";

        if (!data) {
            data = this.model.washoff;
        }

        for (let washoff of data) {
            washoffText += `${washoff.landuse} ${washoff.pollutant} ${washoff.funcType} ${washoff.C1} ${washoff.C2} ${washoff.sweepRmvl} ${washoff.bmpRmvl}\n`;
        }

        return washoffText;
    }

    readTREATMENT(rawTREATMENT) {
        let treatmentList = [];
        let lines = rawTREATMENT.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let node = _line[0];
                let pollutant = _line[1];
                let result = _line[2];
                let func = _line.slice(3).join(" ");

                treatmentList.push({
                    node: node,
                    pollutant: pollutant,
                    result: result,
                    func: func
                });
            }
        }

        this.model.treatment = treatmentList;
    }

    writeTREATMENT(data = null) {
        let treatmentText = "[TREATMENT]\n";

        if (!data) {
            data = this.model.treatment;
        }

        for (let treatment of data) {
            treatmentText += `${treatment.node} ${treatment.pollutant} ${treatment.result} = ${treatment.func}\n`;
        }

        return treatmentText;
    }

    readINFLOWS(rawINFLOWS) {
        let inflowsList = [];
        let lines = rawINFLOWS.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let node = _line[0];
                let inflowType = _line[1];
                let tseries = _line[2];
                let type = _line[3] || "CONCEN";
                let mfactor = parseFloat(_line[4]) || 1.0;
                let sfactor = parseFloat(_line[5]) || 1.0;
                let base = parseFloat(_line[6]) || 0.0;
                let pat = _line[7] || null;

                inflowsList.push({
                    node: node,
                    inflowType: inflowType,
                    tseries: tseries,
                    type: type,
                    mfactor: mfactor,
                    sfactor: sfactor,
                    base: base,
                    pat: pat
                });
            }
        }

        this.model.inflows = inflowsList;
    }

    writeINFLOWS(data = null) {
        let inflowsText = "[INFLOWS]\n";

        if (!data) {
            data = this.model.inflows;
        }

        for (let inflow of data) {
            if (inflow.inflowType === "FLOW") {
                inflowsText += `${inflow.node} FLOW ${inflow.tseries}\n`;
            } else {
                let line = `${inflow.node} ${inflow.inflowType} ${inflow.tseries} ${inflow.type}`;
                if (inflow.type === "MASS") {
                    line += ` ${inflow.mfactor}`;
                }
                line += ` ${inflow.sfactor} ${inflow.base}`;
                if (inflow.pat) {
                    line += ` ${inflow.pat}`;
                }
                line += "\n";
                inflowsText += line;
            }
        }

        return inflowsText;
    }

    readDWF(rawDWF) {
        let dwfList = [];
        let lines = rawDWF.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let node = _line[0];
                let type = _line[1];
                let base = parseFloat(_line[2]);
                let patterns = _line.slice(3) || [];

                dwfList.push({
                    node: node,
                    type: type,
                    base: base,
                    patterns: patterns
                });
            }
        }

        this.model.dwf = dwfList;
    }

    writeDWF(data = null) {
        let dwfText = "[DWF]\n";

        if (!data) {
            data = this.model.dwf;
        }

        for (let dwf of data) {
            let line = `${dwf.node} ${dwf.type} ${dwf.base}`;
            if (dwf.patterns.length > 0) {
                line += ` ${dwf.patterns.join(" ")}`;
            }
            line += "\n";
            dwfText += line;
        }

        return dwfText;
    }

    readRDII(rawRDII) {
        let rdiiList = [];
        let lines = rawRDII.split("\n");

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);
                let node = _line[0];
                let uhGroup = _line[1];
                let sewerArea = parseFloat(_line[2]);

                rdiiList.push({
                    node: node,
                    uhGroup: uhGroup,
                    sewerArea: sewerArea
                });
            }
        }

        this.model.rdii = rdiiList;
    }

    writeRDII(data = null) {
        let rdiiText = "[RDII]\n";

        if (!data) {
            data = this.model.rdii;
        }

        for (let rdii of data) {
            rdiiText += `${rdii.node} ${rdii.uhGroup} ${rdii.sewerArea}\n`;
        }

        return rdiiText;
    }

    readHYDROGRAPHS(rawHYDROGRAPHS) {
        let hydrographs = [];
        let lines = rawHYDROGRAPHS.split("\n");
        let currentGroup = null;

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);

                if (_line.length === 2) {
                    // Group declaration
                    currentGroup = {
                        name: _line[0],
                        raingage: _line[1],
                        hydrographs: []
                    };
                    hydrographs.push(currentGroup);
                } else {
                    // Hydrograph definition
                    let month = _line[1];
                    let type = _line[2];
                    let r = parseFloat(_line[3]);
                    let t = parseFloat(_line[4]);
                    let k = parseFloat(_line[5]);
                    let dmax = _line[6] ? parseFloat(_line[6]) : 0;
                    let drec = _line[7] ? parseFloat(_line[7]) : 0;
                    let d0 = _line[8] ? parseFloat(_line[8]) : 0;

                    currentGroup.hydrographs.push({
                        month: month,
                        type: type,
                        responseRatio: r,
                        timeToPeak: t,
                        recessionRatio: k,
                        maxInitialAbstraction: dmax,
                        initialAbstractionRecovery: drec,
                        initialAbstractionDepth: d0
                    });
                }
            }
        }

        this.model.hydrographs = hydrographs;
    }

    writeHYDROGRAPHS(data = null) {
        let hydrographsText = "[HYDROGRAPHS]\n";

        if (!data) {
            data = this.model.hydrographs;
        }

        for (let group of data) {
            hydrographsText += `${group.name} ${group.raingage}\n`;

            for (let hydro of group.hydrographs) {
                hydrographsText += `${group.name} ${hydro.month} ${hydro.type} ${hydro.responseRatio} ${hydro.timeToPeak} ${hydro.recessionRatio}`;
                if (hydro.maxInitialAbstraction > 0) hydrographsText += ` ${hydro.maxInitialAbstraction}`;
                if (hydro.initialAbstractionRecovery > 0) hydrographsText += ` ${hydro.initialAbstractionRecovery}`;
                if (hydro.initialAbstractionDepth > 0) hydrographsText += ` ${hydro.initialAbstractionDepth}`;
                hydrographsText += "\n";
            }
        }

        return hydrographsText;
    }

    readCURVES(rawCURVES) {
        let curves = [];
        let lines = rawCURVES.split("\n");
        let currentCurve = null;

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);

                if (_line.length === 2) {
                    // Curve definition
                    currentCurve = {
                        name: _line[0],
                        type: _line[1],
                        data: []
                    };
                    curves.push(currentCurve);
                } else {
                    // Data points
                    let data = _line.slice(1).map((value, index) => {
                        return index % 2 === 0 ? { x: parseFloat(value) } : { y: parseFloat(value) };
                    });
                    for (let i = 0; i < data.length; i += 2) {
                        currentCurve.data.push({
                            x: data[i].x,
                            y: data[i + 1].y
                        });
                    }
                }
            }
        }

        this.model.curves = curves;
    }

    writeCURVES(data = null) {
        let curvesText = "[CURVES]\n";

        if (!data) {
            data = this.model.curves;
        }

        for (let curve of data) {
            curvesText += `${curve.name} ${curve.type}\n`;

            for (let point of curve.data) {
                curvesText += `${curve.name} ${point.x} ${point.y} `;
            }
            curvesText += "\n";
        }

        return curvesText;
    }

    readTIMESERIES(rawTIMESERIES) {
        let timeseries = [];
        let lines = rawTIMESERIES.split("\n");
        let currentSeries = null;

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);

                if (_line.length === 2 && _line[1] === 'FILE') {
                    // External file reference
                    timeseries.push({
                        name: _line[0],
                        file: _line[1]
                    });
                } else if (_line.length > 2 && _line[1].includes('/')) {
                    // Date-time-value format
                    if (!currentSeries || currentSeries.name !== _line[0]) {
                        currentSeries = { name: _line[0], type: 'DATE', data: [] };
                        timeseries.push(currentSeries);
                    }
                    currentSeries.data.push({
                        date: _line[1],
                        time: _line[2],
                        value: parseFloat(_line[3])
                    });
                } else {
                    // Elapsed time-value format
                    if (!currentSeries || currentSeries.name !== _line[0]) {
                        currentSeries = { name: _line[0], type: 'TIME', data: [] };
                        timeseries.push(currentSeries);
                    }
                    currentSeries.data.push({
                        time: _line[1],
                        value: parseFloat(_line[2])
                    });
                }
            }
        }

        this.model.timeseries = timeseries;
    }

    writeTIMESERIES(data = null) {
        let timeseriesText = "[TIMESERIES]\n";

        if (!data) {
            data = this.model.timeseries;
        }

        for (let series of data) {
            if (series.file) {
                timeseriesText += `${series.name} FILE "${series.file}"\n`;
            } else {
                for (let point of series.data) {
                    if (series.type === 'DATE') {
                        timeseriesText += `${series.name} ${point.date} ${point.time} ${point.value}\n`;
                    } else if (series.type === 'TIME') {
                        timeseriesText += `${series.name} ${point.time} ${point.value}\n`;
                    }
                }
            }
        }

        return timeseriesText;
    }

    readPATTERNS(rawPATTERNS) {
        let patterns = [];
        let lines = rawPATTERNS.split("\n");
        let currentPattern = null;

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);

                if (_line.length > 1) {
                    let type = _line[1];
                    let factors = _line.slice(2).map(parseFloat);

                    if (type === 'MONTHLY' || type === 'DAILY' || type === 'HOURLY' || type === 'WEEKEND') {
                        currentPattern = { name: _line[0], type: type, factors: factors };
                        patterns.push(currentPattern);
                    }
                }
            }
        }

        this.model.patterns = patterns;
    }

    writePATTERNS(data = null) {
        let patternsText = "[PATTERNS]\n";

        if (!data) {
            data = this.model.patterns;
        }

        for (let pattern of data) {
            let factors = pattern.factors.join(" ");
            patternsText += `${pattern.name} ${pattern.type} ${factors}\n`;
        }

        return patternsText;
    }

    readCONTROLS(rawCONTROLS) {
        let controls = [];
        let lines = rawCONTROLS.split("\n");
        let currentControl = null;
        let inConditions = true;

        for (let line of lines) {
            if (line && !line.startsWith(";")) {
                let _line = line.trim().split(";")[0].split(/\s+/);

                if (_line[0] === 'RULE') {
                    if (currentControl) {
                        controls.push(currentControl);
                    }
                    currentControl = { id: _line[1], conditions: [], actions: [], priority: null };
                    inConditions = true;
                } else if (_line[0] === 'IF' || _line[0] === 'AND' || _line[0] === 'OR') {
                    if (inConditions) {
                        currentControl.conditions.push(line.trim());
                    } else {
                        throw new Error("Conditions and actions cannot be mixed.");
                    }
                } else if (_line[0] === 'THEN') {
                    inConditions = false;
                    currentControl.actions.push(line.trim());
                } else if (_line[0] === 'ELSE') {
                    currentControl.actions.push(line.trim());
                } else if (_line[0] === 'PRIORITY') {
                    currentControl.priority = parseInt(_line[1]);
                }
            }
        }

        if (currentControl) {
            controls.push(currentControl);
        }

        this.model.controls = controls;
    }

    writeCONTROLS(data = null) {
        let controlsText = "[CONTROLS]\n";

        if (!data) {
            data = this.model.controls;
        }

        for (let control of data) {
            controlsText += `RULE        ${control.id}\n`;

            for (let condition of control.conditions) {
                controlsText += `${condition}\n`;
            }

            if (control.actions.length > 0) {
                controlsText += `THEN        ${control.actions[0]}\n`;
                for (let action of control.actions.slice(1)) {
                    controlsText += `AND        ${action}\n`;
                }
            }

            if (control.priority !== null) {
                controlsText += `PRIORITY ${control.priority}\n`;
            }
        }

        return controlsText;
    }
}

let rawString = fs.readFileSync("C:\\Users\\GHUG5611\\Downloads\\Subarea Routing.inp", "utf-8");
let red = new SWMMIo();
red.readFile(rawString);