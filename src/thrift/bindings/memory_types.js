//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
"use strict";

var thrift = require('thrift');
var Thrift = thrift.Thrift;
var Q = thrift.Q;
var Int64 = require('node-int64');

var shared_ttypes = require('./shared_types');


var ttypes = module.exports = {};
var CSpyMemoryBlock = module.exports.CSpyMemoryBlock = function(args) {
  this.data = null;
  this.status = null;
  if (args) {
    if (args.data !== undefined && args.data !== null) {
      this.data = args.data;
    }
    if (args.status !== undefined && args.status !== null) {
      this.status = args.status;
    }
  }
};
CSpyMemoryBlock.prototype = {};
CSpyMemoryBlock.prototype.read = function(input) {
  input.readStructBegin();
  while (true) {
    var ret = input.readFieldBegin();
    var ftype = ret.ftype;
    var fid = ret.fid;
    if (ftype == Thrift.Type.STOP) {
      break;
    }
    switch (fid) {
      case 1:
      if (ftype == Thrift.Type.STRING) {
        this.data = input.readBinary();
      } else {
        input.skip(ftype);
      }
      break;
      case 2:
      if (ftype == Thrift.Type.STRING) {
        this.status = input.readBinary();
      } else {
        input.skip(ftype);
      }
      break;
      default:
        input.skip(ftype);
    }
    input.readFieldEnd();
  }
  input.readStructEnd();
  return;
};

CSpyMemoryBlock.prototype.write = function(output) {
  output.writeStructBegin('CSpyMemoryBlock');
  if (this.data !== null && this.data !== undefined) {
    output.writeFieldBegin('data', Thrift.Type.STRING, 1);
    output.writeBinary(this.data);
    output.writeFieldEnd();
  }
  if (this.status !== null && this.status !== undefined) {
    output.writeFieldBegin('status', Thrift.Type.STRING, 2);
    output.writeBinary(this.status);
    output.writeFieldEnd();
  }
  output.writeFieldStop();
  output.writeStructEnd();
  return;
};

