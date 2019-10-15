# Node.js MtrExt

[![Build Status](https://travis-ci.org/ThatOneNeji/node-mtrext.svg?branch=master)](https://travis-ci.org/ThatOneNeji/node-mtrext)

Node.js wrapper for the `mtr` command / tool.

This project is based heavily on https://github.com/Kami/node-mtr 
I was going to fork that project but I've realized that my fork would contain breaking changes when compared to the results from the original package (node-mtr), hence 'MtrExt' -> "Mtr Extended"


# Table of contents
1. [Installation](#Installation)
2. [Using](#Using)
    * [Example](#Example)
    * [Results](#Results)
3. [Understanding the example](#Understandingtheexample)
4. [Understanding the results](#Understandingtheresults)
5. [Troubleshooting](#Troubleshooting)
    * [Bad parameters for mtr](#Badparametersformtr)
    * [mtr missing or can not be located](#mtrmissingorcannotbelocated)
6. [References](#References)
    * [-o FIELDS](#oFIELDS)
7. [Documentation](#Documentation)

##  1. <a name='Installation'></a>Installation

```bash
npm install mtrext
```

##  2. <a name='Using'></a>Using
###  * <a name='Example'></a>Example
server.js
```javascript
var mtrClient = require('mtrext').MtrExt;
var mtr = new mtrClient('192.168.0.1', { resolveDns: true, packetLen: 60 });
mtr.traceroute();
mtr.on('end', function(results) {
    console.log(JSON.stringify(results));
});
mtr.on('error', function(err) {
    console.error(err);
});
```
###  * <a name='Results'></a>Results
```json
{
    "args": [
        "-4",
        "-o LSDR NBAW JMXI",
        "-r",
        "-w",
        "--psize",
        60,
        "192.168.100.1"
    ],
    "code": 0,
    "status": "success",
    "timetaken": [
        14,
        258393002
    ],
    "data": {
        "raw": "Start: Wed Jun 19 08:55:05 2019\nHOST: server2                         Loss%   Snt Drop   Rcv   Last  Best   Avg  Wrst  Jttr Javg Jmax Jint\n  1.|-- router1           0.0%    10    0    10    1.4   0.4   1.1   3.1   0.9  0.9  2.7  7.3\n  2.|-- server1        0.0%    10    0    10    1.1   0.6   1.3   2.8   1.2  0.9  2.1  7.4\n",
        "hops": [
            {
                "hop": "1",
                "host": "router1",
                "loss": "0.0",
                "snt": "10",
                "drop": "0",
                "rcv": "10",
                "last": "1.4",
                "best": "0.4",
                "avg": "1.1",
                "wrst": "3.1",
                "jttr": "0.9",
                "javg": "0.9",
                "jmax": "2.7",
                "jint": "7.3"
            },
            {
                "hop": "2",
                "host": "server1",
                "loss": "0.0",
                "snt": "10",
                "drop": "0",
                "rcv": "10",
                "last": "1.1",
                "best": "0.6",
                "avg": "1.3",
                "wrst": "2.8",
                "jttr": "1.2",
                "javg": "0.9",
                "jmax": "2.1",
                "jint": "7.4"
            }
        ]
    }
}
```

##  3. <a name='Understandingtheexample'></a>Understanding the example
```javascript
var mtr = new mtrClient('127.0.0.1', { resolveDns: true, packetLen: 60 });
```
This sets up `mtrext` to use the following parameters "resolveDns" and "packetlen" which are both optional.
From "man mtr" for "packetlen"
> If set to a negative number, every iteration will use a different, random packet size up to that number.

##  4. <a name='Understandingtheresults'></a>Understanding the results
"**args**" - This shows the end-user exactly what parameters were passed on to the mtr command. This is shown in case you want to manually re-run the mtr command.
Parameter | Notes
------------ | -------------
-4 | Use IPv4 only
-o LSDR NBAW JMXI | Use this option to specify which fields to display and in which order. See the end of this page for the definitions of the fields.
-r | This option puts mtr into report mode
-w | This option puts mtr into wide report mode.  When in this mode, mtr will not cut hostnames in the report.
--psize | This option sets the packet size used for probing.  It is in bytes, inclusive IP and ICMP headers.
60 | If set to a negative number, every iteration will use a different, random packet size up to that number.
127.0.0.1 | This is the target node that we are using
        
"**code**" - The return code from the mtr command.

"**status**" - This is internally generated to indicate if there were any problems.

"**timetaken**" - This is based on the values coming back from "hrtime" [seconds, nanoseconds]  https://nodejs.org/api/process.html#process_process_hrtime_time 

"**data**" - This contains the "**raw**" output from mtr and the parsed data ("**hops**") based upon that. The "**raw**" output is useful if there is a parsing issue.

##  5. <a name='Troubleshooting'></a>Troubleshooting
From time to time things may go wrong. To that end, I've tried to pad out the err messages as much as possible.
Using the following code block we can view the error(s):
```javascript
mtr.on('error', function(err) {
    console.log(err);
});
```
###  * <a name='Badparamtersformtr'></a>Bad parameters for mtr
Because of the different flavors of mtr, there could be an issue with the parameters that get sent to mtr. The following result set shows how that would look like. "data.results.raw" has the error.
```
{ Error
    at ChildProcess.<anonymous> (/data/projects/node/mtr_test/node_modules/mtrext/lib/mtrext.js:113:19)
    at ChildProcess.emit (events.js:198:13)
    at Process.ChildProcess._handle.onexit (internal/child_process.js:248:12)
  data:
   { args:
      [ '-4',
        '-o LSDR NBAW JMXI CCCC',
        '-r',
        '-w',
        '--psize',
        60,
        '192.168.100.1' ],
     code: 1,
     status: 'failed',
     timetaken: [ 0, 175462135 ],
     results: { raw: 'Unknown field identifier: C\n' } } }
```

###  * <a name='mtrmissingorcannotbelocated'></a>mtr missing or can not be located
Looking at https://nodejs.org/api/errors.html#errors_common_system_errors one can get a better idea of what the system error means. 
In this case, 'mtr' is not found.
> Please note that so far, the Windows platform is not supported as I can't find a CLI version of mtr.
```
{ Error: spawn mtr ENOENT
    at Process.ChildProcess._handle.onexit (internal/child_process.js:240:19)
    at onErrorNT (internal/child_process.js:415:16)
    at process._tickCallback (internal/process/next_tick.js:63:19)
    at Function.Module.runMain (internal/modules/cjs/loader.js:832:11)
    at startup (internal/bootstrap/node.js:283:19)
    at bootstrapNodeJSCore (internal/bootstrap/node.js:622:3)
  errno: 'ENOENT',
  code: 'ENOENT',
  syscall: 'spawn mtr',
  path: 'mtr',
  spawnargs:
   [ '-4',
     '-o LSDR NBAW JMXI',
     '-r',
     '-w',
     '--psize',
     60,
     '192.168.100.1' ] }
```

##  6. <a name='References'></a>References 
`mtr` man page https://linux.die.net/man/8/mtr

###  * <a name='oFIELDS'></a>-o FIELDS
Parameter | Description
------------ | -------------
L | Loss ratio          
S | Sent Packets        
D | Dropped packets     
R | Received packets    
N | Newest RTT(ms)      
B | Min/Best RTT(ms)    
A | Average RTT(ms)     
W | Max/Worst RTT(ms)   
J | Current Jitter      
M | Jitter Mean/Avg.    
X | Worst Jitter        
I | Inter-arrival Jitter 

##  7. <a name='Documentation'></a>Documentation
There is now dynamically generated documentation that is built when ```npm install``` is run.
Those files will be located under the 'documentation' folder. 
The reasoning for adding dynamically generated documentation is that if there was anyone else who wanted to fork this project or get a better understanding of how this all works, then they would have a starting point.