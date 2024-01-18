const childprocess = require('child_process');
const net = require('net');
const util = require('util');
const EventEmitter = require('events').EventEmitter;

/**
 * @const {string}
 * @description This regex pattern is used for extracting the various fields from the returning data. It follows the {@link mtrRoute} object
 */
// eslint-disable-next-line no-useless-escape
const regexPatternMtr = /^\s+?(?<hopID>[\d.]+)\s+(?<asn>AS[\d\?]+)\s+(?<hopAddress>[a-z\d.:i_\-\?()\s]+)\s+(?<loss>[a-z\d.]+)%?\s+(?<snt>[a-z\d.]+)\s+(?<drop>[a-z\d.]+)\s+(?<rcv>[a-z\d.]+)\s+(?<last>[a-z\d.]+)\s+(?<best>[a-z\d.]+)\s+(?<avg>[a-z\d.]+)\s+(?<wrst>[a-z\d.]+)\s+(?<jttr>[a-z\d.]+)\s+(?<javg>[a-z\d.]+)\s+(?<jmax>[a-z\d.]+)\s+(?<jint>[a-z\d.]+)$/i;

/**
 * @const {string}
 * @description This regex pattern is used for extracting the hostname. It follows the {@link mtrRoute} object
 */
const regexPatternHostname = /^HOST:\s(?<value>\S+)\s/mi;

/**
 * @const {string}
 * @description This regex pattern is used for extracting the date time for when the command was run. It follows the {@link mtrRoute} object
 */
const regexPatternDateTime = /^Start:\s(?<value>\S+)$/mi;

/**
 * @property {string} hrstart This varible contains the start time of the call using 'process.hrtime'
 */
const hrstart = process.hrtime();

/**
 * @typedef {object} mtrRoute
 * @property  {number} hop ID of hop
 * @property  {string} host Address or hostname of the intervening routers
 * @property  {number} loss Loss ratio
 * @property  {number} snt Sent Packets
 * @property  {number} drop Dropped packets
 * @property  {number} rcv Received packets
 * @property  {number} last Newest RTT(ms)
 * @property  {number} best Min/Best RTT(ms)
 * @property  {number} avg Average RTT(ms)
 * @property  {number} wrst Max/Worst RTT(ms)
 * @property  {number} jttr Current Jitter
 * @property  {number} javg Jitter Mean/Avg
 * @property  {number} jmax Worst Jitter
 * @property  {number} jint Interarrival Jitter
 * @description The mtrRoute object contains the result of a hop
 */
/**
 * @typedef {object} mtrOptions
 * @property {integer} packetLen Length of the packet to use
 * @property {boolean} resolveDns True/False to resolve the target
 * @description This object contains the optional extra parameters that get used in the mtr process
 */
/**
 * @function MtrExt
 * @param {string} target Host to test against
 * @param {mtrOptions} options This object contains the optional extra parameters that get used in the mtr process
 * @description This function runs the mtr application against the supplied target
 */
function MtrExt(target, options) {
    EventEmitter.call(this);

    options = options || {};
    this._target = target;
    this._options = options;

    // set defaults for later on
    this._packetLen = options.packetLen || 60;
    this._resolveDns = options.resolveDns || false;

    // Tests if input is an IP address. Returns 0 for invalid strings,
    // returns 4 for IP version 4 addresses, and returns 6
    // for IP version 6 addresses
    if (net.isIP(target) === 4) {
        this._addressType = 'ipv4';
    } else if (net.isIP(target) === 6) {
        this._addressType = 'ipv6';
    } else {
        throw new Error('Target is not a valid IPv4 or IPv6 address');
    }
}

util.inherits(MtrExt, EventEmitter);

/**
 * @function traceroute
 * @description Return EventEmitter instance which emitts 'data' event for all hops.
 */
MtrExt.prototype.traceroute = function() {
    const self = this;

    process.nextTick(function() {
        const emitter = self._run(self._target);

        emitter.on('end', function(data) {
            self.emit('end', data);
        });
        emitter.on('error', function(err) {
            self.emit('error', err);
        });
    });
};

/**
 * @function _run
 * @param {string} target Host to test against
 * @return {*}
 * @description This function builds up the arguements needed to be passed on to the spawn process of mtr
 */
MtrExt.prototype._run = function(target) {
    const self = this;
    const args = [];
    let stdoutBuffer;
    let stderrBuffer;
    let data;

    if (this._addressType === 'ipv4') {
        // Use IPv4 only
        args.push('-4');
    } else {
        // Use IPv6 only
        args.push('-6');
    }

    // Using this option to force mtr to display numeric IP numbers and not try
    //     to resolve the host names
    if (!this._resolveDns) {
        args.push('--no-dns');
    }

    // Use this option to specify the fields and their order when loading mtr
    args.push('-o LSDR NBAW JMXI');

    // This option puts mtr into report mode
    args.push('-r');

    // This option displays AS number
    args.push('-z');

    // This option shows IP numbers and host names
    args.push('-b');

    // This option puts mtr into wide report mode. When in this mode, mtr will not cut hostnames in the report.
    args.push('-w');

    // These options or a trailing PACKETSIZE on the commandline sets the packet size used for probing. It is in bytes inclusive IP and ICMP headers
    if (this._packetLen) {
        args.push('--psize');
        args.push(this._packetLen);
    }

    args.push(target);
    const child = this._spawn('mtr', args);
    const emitter = new EventEmitter();

    stdoutBuffer = '';
    stderrBuffer = '';

    child.stdout.on('data', function(chunk) {
        stdoutBuffer += chunk;
    });

    child.stderr.on('data', function(chunk) {
        stderrBuffer += chunk;
    });

    child.on('exit', function(code) {
        let err;
        data = {
            args: args,
            code: code,
            status: 'success',
            timetaken: process.hrtime(hrstart)
        };
        if (code === 0) {
            data.results = self._parseResult(stdoutBuffer);
            data.host = self._getValue(regexPatternHostname, stdoutBuffer);
            data.datetime = self._getValue(regexPatternDateTime, stdoutBuffer);
            emitter.emit('end', data);
        } else {
            data.status = 'failed';
            data.results = {
                raw: stderrBuffer
            };
            err = new Error();
            err.data = data;
            emitter.emit('error', err);
        }
    });
    child.on('error', function(error) {
        emitter.emit('error', error);
    });
    return emitter;
};

/**
 * @function _spawn
 * @param {*} cmd The default is 'mtr'
 * @param {array} args This array contains te list of arguements that need to be sent to the cmd
 * @return {*}
 * @description This function spawns the process that actually runs the mtr process. The location of the mtr application is not specifed, as such it must be in the path environment variable.
 */
MtrExt.prototype._spawn = function(cmd, args) {
    const child = childprocess.spawn(cmd, args);
    return child;
};

/**
 * @function _parseResult
 * @param {string} regex This is the regex pattern to use for extracting a value
 * @param {string} output This is the raw data from the mtr command that was run.
 * @return {string}
 * @description This funtion extracts value(s) from the supplied output parameter
 */
MtrExt.prototype._getValue = function(regex, output) {
    const lines = output.split('\n');
    let parsedResults = '';
    let capturedValue;
    lines.forEach((line) => {
        capturedValue = regex.exec(line);
        if (capturedValue) {
            parsedResults = capturedValue.groups.value;
        }
    });
    return parsedResults;
};


/**
 * @typedef parsedResults
 * @property {string} raw This is the raw result from the mtr command
 * @property {Array.<mtrRoute>} hops Array of returned hops in mtrRoute objects
 */
/**
 * @function _parseResult
 * @param {string} output This is the raw data from the mtr command that was run.
 * @return {parsedResults} The results will be sent back to the function calling the mtr
 * @description The results are parsed and then sent back
 */
MtrExt.prototype._parseResult = function(output) {
    const lines = output.split('\n');
    const parsedResults = {
        raw: output,
        hops: []
    };
    let captureGroups;

    lines.forEach((line) => {
        captureGroups = regexPatternMtr.exec(line);
        if (captureGroups) {
            parsedResults.hops.push(captureGroups.groups);
        }
    });
    return parsedResults;
};

exports.MtrExt = MtrExt;
