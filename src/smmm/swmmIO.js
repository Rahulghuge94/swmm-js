export const _inp_sections = [
    'title', 'options', 'report', 'files', 'raingages', 'evaporation',
    'temperature', 'adjustments', 'subcatchments', 'subareas', 'infiltration',
    'lid_controls', 'lid_usage', 'aquifers', 'groundwater', 'gwf', 'snowpacks',
    'junctions', 'outfalls', 'dividers', 'storage', 'conduits', 'pumps',
    'orifices', 'weirs', 'outlets', 'xsections', 'transects', 'streets',
    'inlets', 'losses', 'controls', 'pollutants', 'landuses', 'coverages',
    'loadings', 'buildup', 'washoff', 'treatment', 'inflows', 'dwf', 'rdii',
    'hydrographs', 'curves', 'timeseries', 'patterns'
];

export const MODEL = {
    'title': {}, 'options': {}, 'report': {},
    'files': {}, 'raingages': {}, 'evaporation': {},
    'temperature': {}, 'adjustments': {}, 'subcatchments': {},
    'subareas': {}, 'infiltration': {}, 'lid_controls': {},
    'lid_usage': {}, 'aquifers': {}, 'groundwater': {}, 
    'gwf': {}, 'snowpacks': {}, 'junctions': {}, 
    'outfalls': {}, 'dividers': {}, 'storage': {}, 
    'conduits': {}, 'pumps': {}, 'orifices': {}, 
    'weirs': {}, 'outlets': {}, 'xsections': {}, 
    'transects': {}, 'streets': {}, 'inlets': {}, 
    'losses': {}, 'controls': {}, 'pollutants': {}, 
    'landuses': {}, 'coverages': {}, 'loadings': {}, 
    'buildup': {}, 'washoff': {}, 'treatment': {}, 
    'inflows': {}, 'dwf': {}, 'rdii': {},
    'hydrographs': {}, 'curves': {}, 'timeseries': {}, 
    'patterns': {}
};

export class InpFile {
    /**
    SWMM INP file reader and writer class.

    This class provides read and write functionality for SWMM INP files.
    The SWMM Users Manual provides full documentation for the INP file format.
    */

    constructor() {
        this.sections = {};
        this.model = JSON.parse(JSON.stringify(MODEL));

        for (let sec of _inp_sections) {
            this.sections[sec] = null;
        }
    }

    read_file(file) {
        file = file.replaceAll("\r\n", "\n"); //replace all \r
        file = file.replaceAll("\t", " "); //replace all \r
        let sections = file.split("[");

        sections.forEach((secText) => {
            if (secText.includes("]\n")) {
                secText = "[" + secText;
                let lines = secText.split("\n");

                if (lines.length > 0) {
                    let key = lines[0].toLowerCase().match(/\[([^\]]+)\]/g)[0].slice(1, -1);
                    this.sections[key] = secText;
                    let method = "read_" + key;

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

    clear_text_section() {
        for (let sec in this.sections) {
            this.sections[sec] = null;
        }
    }

    write_file(sections) {
        let inpText = "";

        Object.entries(sections).map((sec) => {
            if (Object.keys(sec[1]).length > 0) {
                let key = sec[0];
                let value = sec[1];
                //this.sections[key] = secText;
                let method = "write_" + key;

                if (method in this) {
                    this.sections[key] = this[method](value);
                    inpText += this.sections[key] + "\n";
                    //console.log(inpText);
                }
            }
        });

        //add vertices and coordinates;
        this.sections.vertices = this.writeVertices(sections.pipes, sections.pumps, sections.valves);
        inpText += this.sections.vertices + "\n";
        this.sections.coordinates = this.writeCoordinates(sections.junctions, sections.tanks, sections.reservoirs);
        inpText += this.sections.coordinates + "\n";
        inpText += "[END]\n";
        return inpText;
    }

    write_title(titles) {
        return "[TITLE]\n" + titles.join("\n");
    }

    read_title(titles) {
        let Titles = titles.split("\n").slice(1);
        if (Titles[0]  === "[TITLE]") {
            Titles.slice(1);
        }
        if (Titles[Titles.length - 1]  === "") {
            Titles.pop();
        }
        return Titles;
    }

    write_junctions(junctions) {
        let jn_text = "[JUNCTIONS]\n"
        Object.keys(junctions).forEach((val) => {
            let jn = junctions[val];
            let id = jn.properties.id;
            let elev = jn.properties.elevation;
            let demand = jn.properties.demand;
            let pattern = jn.properties.pattern;

            if (pattern  === "" && demand !== "") {
                jn_text += `${id} ${elev} ${demand}\n`;
            } else if (demand  === "") {
                jn_text += `${id} ${elev}\n`
            } else {
                jn_text += `${id} ${elev} ${demand} ${pattern}\n`;
            }
        })
        return jn_text;
    }

    read_junctions(junctions, dicObj) {
        let jn_lines = junctions.split("\n").slice(1);

        jn_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let id = _line[0];
                let elev = _line[1];
                let demand = _line.length > 2 ? _line[2] : "";
                let pattern = _line.length > 3 ? _line[3] : "";

                if (id in dicObj) {
                    dicObj[id].properties.id = id;
                    dicObj[id].properties.elevation = elev;
                    dicObj[id].properties.demand = demand;
                    dicObj[id].properties.pattern = pattern;
                } else {
                    dicObj[id] = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": []
                        },
                        "properties": {
                            id: id, elevation: elev, demand: demand, pattern: pattern
                        }
                    }
                }
                //to include logger in properties.
                _line = line.trimStart().split(";");
                if (_line.length > 1){
                    let tl = _line[1].trimStart().split(/\s+/);
                    if (tl.includes("logger")){
                        dicObj[id].properties.islogger = true;
                    }
                }
            }
        });
        return dicObj;
    }

    write_reservoirs(reservoirs) {
        let res_text = "[RESERVOIRS]\n"
        Object.keys(reservoirs).forEach((val) => {
            let res = reservoirs[val];
            let id = res.properties.id;
            let head = res.properties.head;
            let pattern = res.properties.pattern;

            if (pattern  === "") {
                res_text += `${id} ${head}\n`;
            } else {
                res_text += `${id} ${head} ${pattern}\n`;
            }
        })
        return res_text;
    }

    read_reservoirs(reservoirs, dicObj) {
        let res_lines = reservoirs.split("\n").slice(1);
        res_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let id = _line[0];
                let head = _line[1];
                let pattern = _line.length > 3 ? _line[2] : "";

                if (id in dicObj) {
                    dicObj[id].properties.id = id;
                    dicObj[id].properties.head = head;
                    dicObj[id].properties.pattern = pattern;
                } else {
                    dicObj[id] = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": []
                        },
                        "properties": {
                            id: id, head: head, pattern: pattern
                        }
                    }
                }
            }
        });
        return dicObj;
    }

    write_tanks(tanks) {
        let tank_text = "[TANKS]\n"
        Object.keys(tanks).forEach((val) => {
            let tank = tanks[val];
            let id = tank.properties.id;
            let Elev = tank.properties.elevation;
            let InitLvl = tank.properties.initiallevel;
            let MinLvl = tank.properties.minlevel;
            let MaxLvl = tank.properties.maxlevel;
            let Diam = tank.properties.diameter;
            let MinVol = tank.properties.minvolume;
            let VolCurve = tank.properties.volcurve;
            let Overflow = tank.properties.overflow;

            if (VolCurve === "") {
                VolCurve = "*";
            }
            if (Overflow === "") {
                tank_text += `${id} ${Elev} ${InitLvl} ${MinLvl} ${MaxLvl} ${Diam} ${MinVol} ${VolCurve}\n`
            } else {
                tank_text += `${id} ${Elev} ${InitLvl} ${MinLvl} ${MaxLvl} ${Diam} ${MinVol} ${VolCurve} ${Overflow}\n`
            }
        })
        return tank_text;
    }

    read_tanks(tanks, dicObj) {
        let tank_lines = tanks.split("\n").slice(1);
        tank_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let id = _line[0];
                let Elev = _line[1];
                let InitLvl = _line[2];
                let MinLvl = _line[3];
                let MaxLvl = _line[4];
                let Diam = _line[5];
                let MinVol = _line[6];
                let VolCurve = _line[7];
                let Overflow = _line[8];

                if (id in dicObj) {
                    dicObj[id].properties.id = id;
                    dicObj[id].properties.elevation = Elev;
                    dicObj[id].properties.initiallevel = InitLvl;
                    dicObj[id].properties.minlevel = MinLvl;
                    dicObj[id].properties.maxlevel = MaxLvl;
                    dicObj[id].properties.diameter = Diam;
                    dicObj[id].properties.minvolume = MinVol;
                    dicObj[id].properties.volcurve = VolCurve;
                    dicObj[id].properties.overflow = Overflow;
                } else {
                    dicObj[id] = {
                        "type": "Feature",
                        "geometry": {
                            "type": "Point",
                            "coordinates": []
                        },
                        "properties": {
                            id: id, elevation: Elev, initiallevel: InitLvl, minlevel: MinLvl, maxlevel: MaxLvl, diameter: Diam, minvolume: MinVol, volcurve: VolCurve, overflow: Overflow
                        }
                    }
                }
            }
        });
        return dicObj;
    }

    write_pipes(pipes) {
        let pipes_text = "[PIPES]\n"
        Object.keys(pipes).forEach((val) => {
            let pipe = pipes[val];
            let id = pipe.properties.id;
            let start = pipe.properties.start;
            let end = pipe.properties.end;
            let length = pipe.properties.length;
            let diam = pipe.properties.diameter;
            let roughness = pipe.properties.roughness;
            let mloss = pipe.properties.mloss;
            let status = pipe.properties.status;
            let material = pipe.properties.material;

            pipes_text += `${id} ${start} ${end} ${length} ${diam} ${roughness} ${mloss} ${status}`;
            if (material){
                pipes_text += `;material ${material}\n`;
            }else{
                pipes_text += `\n`;
            }
        });
        
        return pipes_text;
    }

    read_pipes(pipes, dicObj) {
        let pipes_lines = pipes.split("\n").slice(1);
        pipes_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let id = _line[0];
                let start = _line[1];
                let end = _line[2];
                let length = _line[3];
                let diam = _line[4];
                let roughness = _line[5];
                let mloss = _line[6];
                let status = _line[7];

                if (id in dicObj) {
                    dicObj[id].properties.id = id;
                    dicObj[id].properties.start = start;
                    dicObj[id].properties.end = end;
                    dicObj[id].properties.length = length;
                    dicObj[id].properties.diameter = diam;
                    dicObj[id].properties.roughness = roughness;
                    dicObj[id].properties.mloss = mloss;
                    dicObj[id].properties.status = status;
                } else {
                    dicObj[id] = {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "vertices": []
                        },
                        "properties": {
                            id: id, start: start, end: end, length: length, diameter: diam, roughness: roughness, mloss: mloss, status: status,
                        }
                    }
                }
                //to include material in properties.
                _line = line.trimStart().split(";");
                if (_line.length > 1){
                    let tl = _line[1].trimStart().split(/\s+/);
                    if (tl.includes("material")){
                        dicObj[id].properties.material = tl[1];
                    }
                }
            }
        });
        return dicObj;
    }

    write_pumps(pumps) {
        let pumps_text = "[PUMPS]\n"
        Object.keys(pumps).forEach((val) => {
            let pump = pumps[val];
            let id = pump.properties.id;
            let start = pump.properties.start;
            let end = pump.properties.end;
            let head = pump.properties.head;
            let speed = pump.properties.speed;
            let pattern = pump.properties.pattern;
            let power = pump.properties.power;

            pumps_text += `${id} ${start} ${end}`
            if (speed !== "") {
                pumps_text += `  SPEED ${speed}`
            }

            if (pattern !== "") {
                pumps_text += `  PATTERN ${pattern}`
            }

            if (power !== "") {
                pumps_text += `  POWER ${power}`
            }

            if (head !== "") {
                pumps_text += `  HEAD ${head}`
            }
            pumps_text += "\n"
        })
        return pumps_text;
    }

    read_pumps(pumps, dicObj) {
        let pumps_lines = pumps.split("\n").slice(1);
        pumps_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let id = _line[0];
                let start = _line[1];
                let end = _line[2];
                let head = _line.includes("HEAD") ? _line[_line.indexOf("HEAD") + 1] : "";
                let power = _line.includes("POWER") ? _line[_line.indexOf("POWER") + 1] : "";
                let speed = _line.includes("SPEED") ? _line[_line.indexOf("SPEED") + 1] : "";
                let pattern = _line.includes("PATTERN") ? _line[_line.indexOf("PATTERN") + 1] : "";

                if (id in dicObj) {
                    dicObj[id].properties.id = id;
                    dicObj[id].properties.start = start;
                    dicObj[id].properties.end = end;
                    dicObj[id].properties.head = head;
                    dicObj[id].properties.power = power;
                    dicObj[id].properties.pattern = pattern;
                    dicObj[id].properties.speed = speed;
                } else {
                    dicObj[id] = {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "vertices": []
                        },
                        "properties": {
                            id: id, start: start, end: end, head: head, pattern: pattern, power: power, speed: speed
                        }
                    }
                }
            }
        });
        return dicObj;
    }

    write_valves(valves) {
        let valves_text = "[VALVES]\n"
        Object.keys(valves).forEach((val) => {
            let valve = valves[val];
            let id = valve.properties.id;
            let start = valve.properties.start;
            let end = valve.properties.end;
            let diam = valve.properties.diameter;
            let vtype = valve.properties.valvetype;
            let setting = valve.properties.setting;
            let mloss = valve.properties.mloss;

            valves_text += `${id} ${start} ${end} ${diam} ${vtype} ${setting} ${mloss}\n`
        })
        return valves_text;
    }

    read_valves(valves, dicObj) {
        let valves_lines = valves.split("\n").slice(1);
        valves_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let id = _line[0];
                let start = _line[1];
                let end = _line[2];
                let diam = _line[3];
                let vtype = _line[4];
                let setting = _line[5];
                let mloss = _line[6];

                if (id in dicObj) {
                    dicObj[id].properties.id = id;
                    dicObj[id].properties.start = start;
                    dicObj[id].properties.end = end;
                    dicObj[id].properties.diameter = diam;
                    dicObj[id].properties.valvetype = vtype;
                    dicObj[id].properties.setting = setting;
                    dicObj[id].properties.mloss = mloss;
                } else {
                    dicObj[id] = {
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "vertices": []
                        },
                        "properties": {
                            id: id, start: start, end: end, diameter: diam, valvetype: vtype, setting: setting, mloss: mloss
                        }
                    }
                }
            }
        });
        return dicObj;
    }

    write_emitters(emitters) {
        let emitters_text = "[EMITTERS]\n"
        Object.keys(emitters).forEach((val) => {
            let emitter = emitters[val];
            let id = emitter.id;
            let coefficient = emitter.coefficient;

            emitters_text += `${id} ${coefficient}\n`
        })
        return emitters_text;
    }

    read_emitters(emitters, dicObj) {
        let emitters_lines = emitters.split("\n").slice(1);
        emitters_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let id = _line[0];
                let coefficient = _line[1];
                dicObj[id] = `${id} ${coefficient}`
            }
        });
        return dicObj;
    }

    write_demands(demands) {
        let dem_text = "[DEMANDS]\n";
        for (let n in demands) {
            let node = demands[n];
            let count = node.count;
            for (let d = 0; d < count; d++) {
                dem_text += `${n} ${node.demand[d]} ${node.pattern[d]} ;${node.category[d]}\n`;
            }
        }
        return dem_text;
    }

    read_demands(demands, dicObj) {
        let lines = demands.split("\n").slice(1);
        lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let id = _line[0];
                let demand = _line[1];
                let pattern = _line[2];
                let category = _line.length  === 4 ? _line[3] : "";

                if (id in dicObj) {
                    dicObj[id].id = id;
                    dicObj[id].demand.push(demand);
                    dicObj[id].pattern.push(pattern);
                    dicObj[id].category.push(category);
                    dicObj[id].count += 1;
                } else {
                    dicObj[id] = { id: id, pattern: [pattern], demand: [demand], category: [category], count: 1 }
                }
            }
        });
        return dicObj;
    }

    write_rules(rules) {
        let rules_text = "[RULES]\n"
        rules.forEach((val) => {
            let rule = val;
            rules_text += rule + "\n"
        });
        return rules_text;
    }

    read_rules(rules) {
        let start = rules.indexOf("RULE ");
        let rule_lines = rules.slice(start).split("\n \n");
        return rule_lines;
    }

    write_controls(controls) {
        let control_text = "[CONTROLS]\n"
        controls.forEach((val) => {
            let control = val;
            control_text += control + "\n"
        });
        return control_text;
    }

    read_controls(controls, listObj) {
        let control_lines = controls.split("\n").slice(1);

        control_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                listObj.push(line);
            }
        })
        return listObj;
    }

    write_status(status) {
        let status_text = "[STATUS]\n";
        Object.keys(status).forEach((val) => {
            let el = status[val];
            let id = el.id;
            let statSet = el.statSet;
            status_text += `${id} ${statSet}\n`
        })
        return status_text;
    }

    read_status(status, dicObj) {
        let status_lines = status.split("\n").slice(1);
        status_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let id = _line[0];
                let statSet = _line[1];
                dicObj[id] = { id: id, statSet: statSet }
            }
        });
        return dicObj;
    }

    writeCoordinates(junctions, tanks, reservoirs) {
        let coord_text = "[COORDINATES]\n";
        let elements = { ...junctions, ...tanks, ...reservoirs };

        Object.keys(elements).forEach((val) => {
            let element = elements[val];
            let id = val;
            let xy = element.geometry.coordinates;

            coord_text += `${id} ${xy[0]} ${xy[1]}\n`;
        });

        return coord_text;
    }

    read_coordinates(junctions, dicObj) {
        let junction_lines = junctions.split("\n").slice(1);

        junction_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let id = _line[0];
                let coordinates = [parseFloat(_line[1]), parseFloat(_line[2])];

                if (id in this.model.junctions) {
                    this.model.junctions[id].geometry.coordinates = coordinates;
                } else if (id in this.model.reservoirs) {
                    this.model.reservoirs[id].geometry.coordinates = coordinates;
                } else if (id in this.model.tanks) {
                    this.model.tanks[id].geometry.coordinates = coordinates;
                } else {
                    console.log("Unknown ID", id);
                }
                dicObj[id] = coordinates;
            }
        });
        return dicObj
    }

    writeVertices(pipes, pumps, valves) {
        let vertices_text = "[VERTICES]\n";
        let elements = { ...pipes, ...pumps, ...valves };

        Object.keys(elements).forEach((val) => {
            let element = elements[val];
            let id = val;
            if (element.geometry.vertices.length > 2) {
                element.geometry.vertices.forEach((xy) => {
                    vertices_text += `${id} ${xy[0]} ${xy[1]}\n`;
                });
            }
        });

        return vertices_text;
    }

    read_vertices(vertices, dicObj) {
        let vertice_lines = vertices.split("\n").slice(1);
        vertice_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].split(/\s+/);
                let id = _line[0];
                let coordinates = [parseFloat(_line[1]), parseFloat(_line[2])];
                if (id in this.model.pipes) {
                    this.model.pipes[id].geometry.vertices.push(coordinates);
                }

                if (id in dicObj) {
                    dicObj[id].push(coordinates);
                } else {
                    dicObj[id] = [coordinates];
                }
            }
        });
        return dicObj;
    }

    write_patterns(patterns) {
        let patt_text = "[PATTERNS]\n"
        Object.keys(patterns).forEach((val) => {
            let pattern = patterns[val];
            let id = pattern.id;
            let multipliers = pattern.multipliers;

            multipliers.forEach((v) => {
                patt_text += `${id} ${v}\n`;
            });
        })
        return patt_text;
    }

    read_patterns(patterns, dicObj) {
        let pat_lines = patterns.split("\n").slice(1);
        pat_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].trimEnd().split(/\s+/);
                let id = _line[0];

                let values = _line.slice(1);

                if (id in dicObj) {
                    dicObj[id].id = id;
                    dicObj[id].multipliers = dicObj[id].multipliers.concat(values);
                } else {
                    dicObj[id] = { multipliers: [...values], id: id };
                }
            }
        });
        return dicObj;
    }

    write_curves(curves) {
        let patt_text = "[CURVES]\n"
        Object.keys(curves).forEach((val) => {
            let curve = curves[val];
            let id = curve.id;
            let values = curve.values;

            values.forEach((v) => {
                patt_text += `${id} ${v[0]} ${v[1]}\n`;
            });
        })
        return patt_text;
    }

    read_curves(curves, dicObj) {
        let curve_lines = curves.split("\n").slice(1);
        curve_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(";")[0].trimEnd().split(/\s+/);
                let id = _line[0];
                let values = _line.slice(1);
                if (id in dicObj) {
                    dicObj[id].id = id;
                    dicObj[id].values.push([values[0], values[1]]);
                } else {
                    dicObj[id] = { values: [[values[0], values[1]]], id: id };
                }
            }
        });
        return dicObj;
    }

    write_energy(energy) {
        let en_text = "[ENERGY]\n";

        if (energy.globalprice) {
            en_text += `GLOBAL PRICE           ${energy.globalprice}\n`;
        }

        if (energy.globalefficiency) {
            en_text += `GLOBAL EFFIC           ${energy.globalefficiency}\n`;
        }

        if (energy.globalpattern) {
            en_text += `GLOBAL PATTERN         ${energy.globalpattern}\n`;
        }

        if (energy.pump) {
            for (let i in energy.pump) {
                let pump = energy.pump[i];
                if (pump.price) {
                    en_text += `PUMP   ${i} PRICE           ${pump.price}\n`;
                }

                if (pump.efficiency) {
                    en_text += `PUMP   ${i} EFFIC           ${pump.efficiency}\n`;
                }

                if (pump.pattern) {
                    en_text += `PUMP   ${i} PATTERN         ${pump.pattern}\n`;
                }
            }
        }

        if (energy.demandcharge) {
            en_text += `DEMAND CHARGE          ${energy.demandcharge}\n`;
        }

        return en_text;
    }

    remove_blank(val_ar) {
        let f_ar = [];
        val_ar.forEach((v) => {
            if (v !== "") {
                f_ar.push(v);
            }
        })
    }

    read_energy(energy, dicObj) {
        let energy_lines = energy.split("\n").slice(1);
        energy_lines.forEach((line) => {
            let _line = line.trimStart().split(";")[0].trimEnd().split(/\s+/);

            if (_line[0]  === "GLOBAL") {
                if (_line[1]  === "EFFIC" || _line[1]  === "EFFICIENCY") {
                    dicObj.globalefficiency = _line[2];
                }
                if (_line[1]  === "PRICE") {
                    dicObj.globalprice = _line[2];
                }
                if (_line[1]  === "PATTERN") {
                    dicObj.globalpattern = _line[2];
                }
            }

            if (_line[0]  === "PUMP") {
                let id = _line[1];
                dicObj.pumps[id] = { id: id, pattern: null, price: null, efficiency: null }
                if (_line[2]  === "EFFIC" || _line[1]  === "EFFICIENCY") {
                    dicObj.pumps[id].efficiency = _line[3];
                }
                if (_line[2]  === "PRICE") {
                    dicObj.pumps[id].price = _line[3];
                }
                if (_line[2]  === "PATTERN") {
                    dicObj.pumps[id].pattern = _line[3];
                }
            }

            if (_line[0]  === "DEMAND") {
                dicObj.demandcharge = _line[1];
            }
        });
        return dicObj;
    }

    write_options(options) {
        let op_text = "[OPTIONS]\n";

        if (options.units) {
            op_text += `UNITS ${options.units}\n`;
        }

        if (options.headloss) {
            op_text += `HEADLOSS ${options.headloss}\n`;
        }

        if (options.viscosity) {
            op_text += `VISCOSITY ${options.viscosity}\n`;
        }

        if (options.hydraulics) {
            if (options.hydraulic.SAVE) {
                op_text += `HYDRAULICS SAVE ${options.hydraulics.SAVE}\n`;
            }
            if (options.hydraulic.USE) {
                op_text += `HYDRAULICS USE ${options.hydraulics.USE}\n`;
            }
        }

        if (options.specificgravity) {
            op_text += `SPECIFIC GRAVITY ${options.specificgravity}\n`;
        }

        if (options.trials) {
            op_text += `TRIALS ${options.trials}\n`;
        }

        if (options.accuracy) {
            op_text += `ACCURACY ${options.accuracy}\n`;
        }

        if (options.flowchange) {
            op_text += `FLOWCHANGE ${options.flowchange}\n`;
        }

        if (options.headerror) {
            op_text += `HEADERROR ${options.headerror}\n`;
        }

        if (options.checkfreq) {
            op_text += `CHECKFREQ ${options.checkfreq}\n`;
        }

        if (options.maxcheck) {
            op_text += `MAXCHECK ${options.maxcheck}\n`;
        }

        if (options.damplimit) {
            op_text += `DAMPLIMIT ${options.damplimit}\n`;
        }

        if (options.unbalanced) {
            op_text += `UNBALANCED ${options.unbalanced}\n`;
        }

        if (options.demandmodel) {
            op_text += `DEMAND MODEL ${options.demandmodel}\n`;
        }

        if (options.minimumpressure) {
            op_text += `MINIMUM PRESSURE ${options.minimumpressure}\n`;
        }

        if (options.requiredpressure) {
            op_text += `REQUIRED PRESSURE ${options.requiredpressure}\n`;
        }

        if (options.pressureexponent) {
            op_text += `PRESSURE EXPONENT ${options.pressureexponent}\n`;
        }

        if (options.pattern) {
            op_text += `PATTERN ${options.pattern}\n`;
        }

        if (options.demandmultiplier) {
            op_text += `DEMAND MULTIPLIER ${options.demandmultiplier}\n`;
        }

        if (options.emitterexponent) {
            op_text += `EMITTER EXPONENT ${options.emitterexponent}\n`;
        }

        if (options.diffusivity) {
            op_text += `DIFFUSIVITY ${options.diffusivity}\n`;
        }

        if (options.tolerance) {
            op_text += `TOLERANCE ${options.tolerance}\n`;
        }

        if (options.map) {
            op_text += `MAP ${options.map}\n`;
        }

        if (options.quality) {
            op_text += `QUALITY ${options.quality}\n`;
        }
        return op_text;
    }

    read_options(options, dicObj) {
        let OPNS = {
            FLOW_UNITS: null, INFILTRATION: null, FLOW_ROUTING: null,
            LINK_OFFSETS: null, FORCE_MAIN_EQUATION: null, IGNORE_RAINFALL: null,
            IGNORE_SNOWMELT: null, IGNORE_GROUNDWATER: null, IGNORE_RDII: null,
            IGNORE_ROUTING: null, IGNORE_QUALITY: null, ALLOW_PONDING: null,
            SKIP_STEADY_STATE: null, SYS_FLOW_TOL: null, LAT_FLOW_TOL: null,
            START_DATE: null, START_TIME: null, END_DATE: null, END_TIME: null,
            REPORT_START_DATE: null, REPORT_START_TIME: null, SWEEP_START: null,
            SWEEP_END: null, DRY_DAYS: null, REPORT_STEP: null, WET_STEP: null,
            DRY_STEP: null, ROUTING_STEP: null, LENGTHENING_STEP: null,
            VARIABLE_STEP: null, MINIMUM_STEP: null, INERTIAL_DAMPING: null,
            NORMAL_FLOW_LIMITED: null, SURCHARGE_METHOD: null, MIN_SURFAREA: null,
            MIN_SLOPE: null, MAX_TRIALS: null, HEAD_TOLERANCE: null, THREADS: null
        };

        let op_lines = options.split("\n").slice(1);

        op_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().split(/\s+/);

                if (OPNS.includes(_line[0].toUpperCase() + " " + _line[1].toUpperCase())) {
                    dicObj[_line[0].toLowerCase() + _line[1].toLowerCase()] = _line[2];
                } else {
                    if (_line[0].toUpperCase()  === "HYDRAULICS") {
                        if (_line[1]  === "USE") {
                            dicObj[_line[0].toLowerCase()] = { USE: _line[2] };
                        } else {
                            dicObj[_line[0].toLowerCase()] = { SAVE: _line[2] };
                        }
                    } else if (_line[0].toUpperCase()  === "UNBALANCED") {
                        if (_line.length  === 3) {
                            dicObj[_line[0].toLowerCase()] = _line[1] + " " + _line[2];
                        } else {
                            dicObj[_line[0].toLowerCase()] = _line[1];
                        }
                    } else {
                        dicObj[_line[0].toLowerCase()] = _line[1];
                    }
                }
            }
        });

        return dicObj;
    }

    write_times(times) {
        let op_text = "[TIMES]\n";

        if (times.duration) {
            op_text += `DURATION ${times.duration.value} ${times.duration.unit}\n`;
        }

        if (times.hydraulictimestep) {
            op_text += `HYDRAULIC TIMESTEP ${times.hydraulictimestep.value} ${times.hydraulictimestep.unit}\n`;
        }

        if (times.qualitytimestep) {
            op_text += `QUALITY TIMESTEP ${times.qualitytimestep.value} ${times.qualitytimestep.unit}\n`;
        }

        if (times.ruletimestep) {
            op_text += `RULE TIMESTEP ${times.ruletimestep.value} ${times.ruletimestep.unit}\n`;
        }

        if (times.patterntimestep) {
            op_text += `PATTERN TIMESTEP ${times.patterntimestep.value} ${times.patterntimestep.unit}\n`;
        }

        if (times.patternstart) {
            op_text += `PATTERN START ${times.patternstart.value} ${times.patternstart.unit}\n`;
        }

        if (times.reporttimestep) {
            op_text += `REPORT TIMESTEP ${times.reporttimestep.value} ${times.reporttimestep.unit}\n`;
        }

        if (times.reportstart) {
            op_text += `REPORT START ${times.reportstart.value} ${times.reportstart.unit}\n`;
        }

        if (times.startclocktime) {
            op_text += `START CLOCKTIME ${times.startclocktime.value} ${times.startclocktime.unit}\n`;
        }

        if (times.statistic) {
            op_text += `STATISTIC ${times.statistic}\n`;
        }
        op_text = op_text.replaceAll(" undefined\n", "\n");
        return op_text;
    }

    read_times(times, dicObj) {
        let TIMES = ['DURATION', 'HYDRAULIC TIMESTEP', 'QUALITY TIMESTEP', 'RULE TIMESTEP',
            'PATTERN TIMESTEP', 'PATTERN START', 'REPORT TIMESTEP', 'REPORT START',
            'START CLOCKTIME', 'STATISTIC'];

        let op_lines = times.split("\n").slice(1);

        op_lines.forEach((line) => {
            if (line && !line.startsWith(";")) {
                let _line = line.trimStart().trimEnd().split(/\s+/);
                if (TIMES.includes(_line[0].toUpperCase() + " " + _line[1].toUpperCase())) {
                    dicObj[_line[0].toLowerCase() + _line[1].toLowerCase()] = { value: _line[2]};
                    if (_line.length > 3){
                        dicObj[_line[0].toLowerCase() + _line[1].toLowerCase()].unit = _line[3];
                    }
                } else {
                    if (_line[0].toUpperCase()  === "STATISTIC") {
                        dicObj[_line[0].toLowerCase()] = _line[1];

                    } else {
                        dicObj[_line[0].toLowerCase()] = { value: _line[1]};
                        if (_line.length > 2){
                            dicObj[_line[0].toLowerCase()].unit = _line[2];
                        }
                    }
                }
            }
        });

        return dicObj;
    }

    get_coord_value(id) {
        if (id in this.model.junctions) {
            return this.model.junctions[id].geometry.coordinates;
        } else if (id in this.model.tanks) {
            return this.model.tanks[id].geometry.coordinates;
        } else if (id in this.model.reservoirs) {
            return this.model.reservoirs[id].geometry.coordinates;
        }
    }

    assign_link_start_End(elDict) {
        Object.keys(elDict).map((id) => {
            let el = elDict[id];
            let start = el.properties.start;
            let end = el.properties.end;
            let verts = el.geometry.vertices;
            let startCoord = this.get_coord_value(start);
            let endCoord = this.get_coord_value(end);

            if (startCoord && endCoord) {
                if (verts.length === 0 || verts.length === 1){
                    elDict[id].geometry.vertices = [startCoord, ...elDict[id].geometry.vertices, endCoord];
                }else{
                    if (verts[0][0] !== startCoord[0] && verts[0][1] !== startCoord[1]){
                        elDict[id].geometry.vertices = [startCoord, ...elDict[id].geometry.vertices];
                    }
                    if (verts[verts.length - 1][1] !== endCoord[1]){
                        elDict[id].geometry.vertices = [...elDict[id].geometry.vertices, endCoord];
                    }
                }
            }
        });
        return elDict;
    }
}

// const NodeResultTypes = {
//     "Demand",
//     "Head",
//     "Pressure",
//     "WaterQuality"
// }

// const LinkResultTypes = {
//     Flow,
//     Velcoity,
//     Headloss,
//     AvgWaterQuality,
//     Status,
//     Setting,
//     ReactionRate,
//     Friction
// }

const LinkResults = {
    flow: [],
    velcoity: [],
    headloss: [],
    avgWaterQuality: [],
    status: [],
    setting: [],
    reactionRate: [],
    friction: [],
}

const NodeResults = {
    demand: [],
    head: [],
    pressure: [],
    waterQuality: [],
}

const EpanetProlog = {
    nodeCount: null,
    resAndTankCount: null,
    linkCount: null,
    pumpCount: null,
    valveCount: null,
    reportingPeriods: null,
}

const EpanetResults = {
    prolog: EpanetProlog,
    results: {
        nodes: [],
        links: [],
    }
}

const PRESSURE_UN = { 0: "psi", 1: "m", 2: "kPa" };

export function readBinary(results) {
    const view1 = new DataView(results.buffer);
    const prolog = {
        nodeCount: view1.getInt32(8, true),
        resAndTankCount: view1.getInt32(12, true),
        linkCount: view1.getInt32(16, true),
        pumpCount: view1.getInt32(20, true),
        valveCount: view1.getInt32(24, true),
        watQualOption: view1.getInt32(28, true),
        traceNodeIndex: view1.getInt32(32, true),
        flowUnOption: view1.getInt32(36, true),
        presUnoption: view1.getInt32(40, true),
        reportStatType: view1.getInt32(44, true),
        reportStartTime: view1.getInt32(48, true),
        reportTimeStep: view1.getInt32(52, true),
        simDuration: view1.getInt32(54, true), //56+4=60
        reportingPeriods: view1.getInt32(results.byteLength - 12, true)
    };

    const offsetResults =
        884 +
        36 * prolog.nodeCount +
        52 * prolog.linkCount +
        8 * prolog.resAndTankCount +
        28 * prolog.pumpCount +
        4;

    const nodeIdStart = 884;
    const nodeIdEnd = 884 + (prolog.nodeCount * 32);
    const linkIdStart = nodeIdEnd;
    const linkIdEnd = linkIdStart + (prolog.linkCount * 32);

    const nodesList = getStringIDs(nodeIdStart, nodeIdEnd, view1);
    const linksList = getStringIDs(linkIdStart, linkIdEnd, view1);

    const nodes = [...Array(prolog.nodeCount)].map((_, i) => {
        return getNodeResults(prolog, offsetResults, i, view1);
    });

    const links = [...Array(prolog.linkCount)].map((_, i) => {
        return getLinkResults(prolog, offsetResults, i, view1);
    });

    let nodesRes = {};
    let linksRes = {};

    nodesList.forEach((node, ind) => {
        let res = nodes[ind];
        nodesRes[node] = res;
    });

    linksList.forEach((link, ind) => {
        let res = links[ind];
        linksRes[link] = res;
    });

    const data = {
        prolog,
        results: {
            nodesRes,
            linksRes,
        }
    };

    return data;
}

const getStringIDs = (start, end, dataView) => {
    const txtBuffer = dataView.buffer.slice(start, end);
    const decoder = new TextDecoder('utf-8');
    const txt = decoder.decode(txtBuffer);

    const rgx = new RegExp(`.{1,${32}}`, 'g');
    let vals = txt.match(rgx);
    vals = vals.map((x) => {
        return x.replace(/\x00/g, "");
    });
    return vals;
}

const getNodeResults = (
    prolog,
    offsetResults,
    nodeIndex,
    dataView
) => {
    const nodeResults = {
        demand: [],
        head: [],
        pressure: [],
        waterQuality: []
    };

    const result = [
        "demand",
        "head",
        "pressure",
        "waterQuality"
    ].reduce((map, obj, i) => {
        return {
            ...map,
            [obj]: getResultByteOffSet(prolog, offsetResults, true, nodeIndex, i).map(
                x => dataView.getFloat32(x, true)
            )
        };
    }, nodeResults);

    return result;
};

const getLinkResults = (
    prolog,
    offsetResults,
    linkIndex,
    dataView
) => {
    const linkResults = {
        flow: [],
        velcoity: [],
        headloss: [],
        avgWaterQuality: [],
        status: [],
        setting: [],
        reactionRate: [],
        friction: []
    };

    const result = [
        "flow",
        "velcoity",
        "headloss",
        "avgWaterQuality",
        "status",
        "setting",
        "reactionRate",
        "friction"
    ].reduce((map, obj, i) => {
        return {
            ...map,
            [obj]: getResultByteOffSet(
                prolog,
                offsetResults,
                false,
                linkIndex,
                i
            ).map(x => dataView.getFloat32(x, true))
        };
    }, linkResults);

    return result;
};

const getResultByteOffSet = (
    prolog,
    offsetResults,
    isNode,
    objIndex,
    resultType
) => {
    const linkResultOffset = isNode ? 0 : 16 * prolog.nodeCount;
    const resultSize = 16 * prolog.nodeCount + 32 * prolog.linkCount;
    const answer = [...Array(prolog.reportingPeriods)].map(
        (_, i) =>
            offsetResults +
            resultSize * i +
            linkResultOffset +
            4 * objIndex +
            4 * resultType * prolog.nodeCount
    );
    return answer;
};
