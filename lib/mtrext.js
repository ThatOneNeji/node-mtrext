var childprocess = require('child_process');
var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var mtrPattern = /^\s+?([0-9]+)[.\|\-\s]+([a-zA-Z0-9.i\-\?]+)\s+([a-zA-Z0-9.]+)%?\s+([a-zA-Z0-9.]+)\s+([a-zA-Z0-9.]+)\s+([a-zA-Z0-9.]+)\s+([a-zA-Z0-9.]+)\s+([a-zA-Z0-9.]+)\s+([a-zA-Z0-9.]+)\s+([a-zA-Z0-9.]+)\s+([a-zA-Z0-9.]+)\s+([a-zA-Z0-9.]+)\s+([a-zA-Z0-9.]+)\s+([a-zA-Z0-9.]+)$/i;
var hrstart;

function MtrExt(target, options) {
    EventEmitter.call(this);

    options = options || {};
    this._target = target;
    this._options = options;

    this._packetLen = options.packetLen || 60;
    this._resolveDns = options.resolveDns || false;

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
 * Return EventEmitter instance which emitts 'data' event for all hops.
 *
 */
MtrExt.prototype.traceroute = function() {
    var self = this;

    process.nextTick(function() {
        var emitter = self._run(self._target);

        emitter.on('end', function(data) {
            self.emit('end', data);
        });
        emitter.on('error', function(err) {
            self.emit('error', err);
        });
    });
};

MtrExt.prototype._run = function(target) {
    var self = this,
        args, child, emitter, stdoutBuffer, stderrBuffer, data;

    args = [];

    if (this._addressType === 'ipv4') {
        /* Use IPv4 only */
        args.push('-4');
    } else {
        /* Use IPv6 only */
        args.push('-6');
    }

    /* Using this option to force mtr to display numeric IP numbers and not try to resolve the host names */
    if (!this._resolveDns) {
        args.push('--no-dns');
    }

    /* Use this option to specify the fields and their order when loading mtr */
    args.push('-o LSDR NBAW JMXI');

    /* This option puts mtr into report mode */
    args.push('-r');

    /* This option puts mtr into wide report mode. When in this mode, mtr will not cut hostnames in the report. */
    args.push('-w');

    /* These options or a trailing PACKETSIZE on the commandline sets the packet size used for probing. It is in bytes inclusive IP and ICMP headers */
    if (this._packetLen) {
        args.push('--psize');
        args.push(this._packetLen);
    }

    args.push(target);
    hrstart = process.hrtime();
    child = this._spawn('mtr', args);
    emitter = new EventEmitter();

    stdoutBuffer = '';
    stderrBuffer = '';

    child.stdout.on('data', function(chunk) {
        stdoutBuffer += chunk;
    });

    child.stderr.on('data', function(chunk) {
        stderrBuffer += chunk;
    });

    child.on('exit', function(code) {
        var err;
        data = {
            args: args,
            code: code,
            status: 'success',
            timetaken: process.hrtime(hrstart)
        };
        if (code === 0) {
            data.results = self._parseResult(stdoutBuffer);
            emitter.emit('end', data);
        } else {
            data.status = 'failed';
            data.results = stderrBuffer;
            err = new Error('Error: ' + data);
            emitter.emit('error', err);
        }
    });
    child.on('error', function(error) {
        emitter.emit('error', error);
    });
    return emitter;
};

MtrExt.prototype._spawn = function(cmd, args) {
    var child = childprocess.spawn(cmd, args);
    return child;
};

MtrExt.prototype._parseResult = function(output) {
    var lines, line, parsedResults, i, match, mtrRoute;
    lines = output.split('\n');

    parsedResults = {
        raw: output,
        hops: []
    };

    for (i = 0; i < lines.length; i++) {
        line = lines[i];
        match = mtrPattern.exec(line);
        if (match) {
            mtrRoute = {
                hop: match[1],
                host: match[2],
                loss: match[3],
                snt: match[4],
                drop: match[5],
                rcv: match[6],
                last: match[7],
                best: match[8],
                avg: match[9],
                wrst: match[10],
                jttr: match[11],
                javg: match[12],
                jmax: match[13],
                jint: match[14]
            };
            parsedResults.hops.push(mtrRoute);
        }
    }
    return parsedResults;
};

exports.MtrExt = MtrExt;