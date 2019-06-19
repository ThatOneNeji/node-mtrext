# Node.js MtrExt

Node.js wrapper for the `mtr` command / tool.

This project is based heavily on https://github.com/Kami/node-mtr 
I was going to fork that project but I've realised that my fork would contain breaking changes when compared to the results from the original package (node-mtr), hence 'MtrExt' -> "Mtr Extended"

## Installation

```bash
npm install mtrext
```

## Using
### Example
server.js
```javascript
var mtrClient = require('mtrext').MtrExt;
var mtr = new mtrClient('192.168.0.1', { resolveDns: true, packetLen: 60 });
mtr.traceroute();
mtr.on('end', function(results) {
    console.log(JSON.stringify(results));
});
mtr.on('error', function(err) {
    console.error(err);
});
```
### Results
```json
{
	"args": [
		"-4",
		"-o LSDR NBAW JMXI",
		"-r",
		"-w",
		"--psize",
		60,
		"192.168.100.1"
	],
	"code": 0,
	"status": "success",
	"timetaken": [
		14,
		258393002
	],
	"data": {
		"raw": "Start: Wed Jun 19 08:55:05 2019\nHOST: server2                         Loss%   Snt Drop   Rcv   Last  Best   Avg  Wrst  Jttr Javg Jmax Jint\n  1.|-- router1           0.0%    10    0    10    1.4   0.4   1.1   3.1   0.9  0.9  2.7  7.3\n  2.|-- server1        0.0%    10    0    10    1.1   0.6   1.3   2.8   1.2  0.9  2.1  7.4\n",
		"hops": [
			{
				"hop": "1",
				"host": "router1",
				"loss": "0.0",
				"snt": "10",
				"drop": "0",
				"rcv": "10",
				"last": "1.4",
				"best": "0.4",
				"avg": "1.1",
				"wrst": "3.1",
				"jttr": "0.9",
				"javg": "0.9",
				"jmax": "2.7",
				"jint": "7.3"
			},
			{
				"hop": "2",
				"host": "server1",
				"loss": "0.0",
				"snt": "10",
				"drop": "0",
				"rcv": "10",
				"last": "1.1",
				"best": "0.6",
				"avg": "1.3",
				"wrst": "2.8",
				"jttr": "1.2",
				"javg": "0.9",
				"jmax": "2.1",
				"jint": "7.4"
			}
		]
	}
}
```

## Understanding the example
```javascript
var mtr = new mtrClient('127.0.0.1', { resolveDns: true, packetLen: 60 });
```
This sets up mtrext to use the following parameters "resolveDns" and "packetlen" which are both optional.
From "man mtr" for "packetlen"
> If set to a negative number, every iteration will use a different, random packet size up to that number.

## Understanding the results
"**args**" - This shows the end user exactly what paramters was passed on to the mtr command. This is shown in case you want to manually re-run the mtr command.
Parameter | Notes
------------ | -------------
-4 | Use IPv4 only
-o LSDR NBAW JMXI | Use this option to specify which fields to display and in which order. See end of this page for the definitions of the fields.
-r | This option puts mtr into report mode
-w | This option puts mtr into wide report mode.  When in this mode, mtr will not cut hostnames in the report.
--psize | This option sets the packet size used for probing.  It is in bytes, inclusive IP and ICMP headers.
60 | If set to a negative number, every iteration will use a different, random packet size up to that number.
127.0.0.1 | 
		
"**code**" - The return code from the mtr command
"**status**" - This is internally generated to indicate if there were any problems.
"**timetaken**" - This is based on the values coming back from "hrtime" [seconds, nanoseconds]  https://nodejs.org/api/process.html#process_process_hrtime_time 

"**data**" - This contains the "**raw**" output from mtr and the parsed data ("**hops**") based upon that. The "**raw**" output is usefull if there is a parsing issue.

## Referances 
`mtr` man page https://linux.die.net/man/8/mtr

### -o FIELDS
Parameter | Notes
------------ | -------------
L | Loss ratio          
S | Sent Packets        
D | Dropped packets     
R | Received packets    
N | Newest RTT(ms)      
B | Min/Best RTT(ms)    
A | Average RTT(ms)     
W | Max/Worst RTT(ms)   
J | Current Jitter      
M | Jitter Mean/Avg.    
X | Worst Jitter        
I | Interarrival Jitter 
