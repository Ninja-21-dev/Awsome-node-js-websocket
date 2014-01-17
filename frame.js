"use strict"

// Utility functions for creating frames

// Creates a text frame
// data is a string
// masked is a boolean that indicate if the frame should be masked (default: false)
exports.createTextFrame = function (data, masked) {
	var payload, meta
	
	payload = new Buffer(data)
	meta = generateMetaData(true, 1, masked===undefined ? false : masked, payload)
	
	return Buffer.concat([meta, payload], meta.length+payload.length)
}

// Create a binary frame
// data is a Buffer
// masked is a boolean that indicate if the frame should be masked (default: false)
// first is a boolean that indicate if this is the first frame in a sequence (default: true)
// fin is a boolean that indicates if this is the final frame in a sequence (default: true)
exports.createBinaryFrame = function (data, masked, first, fin) {
	var payload, meta
	
	first = first===undefined ? true : first
	masked = masked===undefined ? false : masked
	if (masked) {
		payload = new Buffer(data.length)
		data.copy(payload)
	} else
		payload = data
	meta = generateMetaData(fin===undefined ? true : fin, first ? 2 : 0, masked, payload)
	
	return Buffer.concat([meta, payload], meta.length+payload.length)
}

// Create a close frame
// code is a integer
// reason is a string (default: "")
// masked is a boolean that indicate if the frame should be masked (default: false)
exports.createCloseFrame = function (code, reason, masked) {
	var payload, meta
	
	if (code !== undefined && code != 1005) {
		payload = new Buffer(reason===undefined ? "--" : "--"+reason)
		payload.writeUInt16BE(code, 0)
	} else
		payload = new Buffer(0)
	meta = generateMetaData(true, 8, masked===undefined ? false : masked, payload)
	
	return Buffer.concat([meta, payload], meta.length+payload.length)
}

// Create a ping frame
// masked is a boolean that indicate if the frame should be masked (default: false)
exports.createPingFrame = function (masked) {
	return generateMetaData(true, 9, masked===undefined ? false : masked, new Buffer(0))
}

// Create a pong frame
// data is a string
// masked is a boolean that indicate if the frame should be masked (default: false)
exports.createPongFrame = function (data, masked) {
	var payload, meta
	
	payload = new Buffer(data)
	meta = generateMetaData(true, 10, masked===undefined ? false : masked, payload)
	
	return Buffer.concat([meta, payload], meta.length+payload.length)
}

// Creates the meta-data portion of the frame
// fin is a bool, opcode is a int, masked is a bool and payload is a Buffer
// If the frame is masked, the payload is altered accordingly
function generateMetaData(fin, opcode, masked, payload) {
	var len, meta, start, mask, i
	
	len = payload.length
	
	// Creates the buffer for meta-data
	meta = new Buffer(2+(len<126 ? 0 : (len<65536 ? 2 : 8))+(masked ? 4 : 0))
	
	// Sets fin and opcode
	meta[0] = (fin ? 128 : 0)+opcode
	
	// Sets the mask and length
	meta[1] = masked ? 128 : 0
	start = 2
	if (len < 126)
		meta[1] += len
	else if (len < 65536) {
		meta[1] += 126
		meta.writeUInt16BE(len, 2)
		start += 2
	} else {
		// Warning: JS doesn't support integers greater than 2^53
		meta[1] += 127
		meta.writeUInt32BE(Math.floor(len/Math.pow(2, 32)), 2)
		meta.writeUInt32BE(len%Math.pow(2, 32), 6)
		start += 8
	}
	
	// Set the mask-key
	if (masked) {
		mask = new Buffer(4)
		for (i=0; i<4; i++)
			meta[start+i] = mask[i] = Math.floor(Math.random()*256)
		for (i=0; i<payload.length; i++)
			payload[i] ^= mask[i%4]
		start += 4
	}
	
	return meta
}
