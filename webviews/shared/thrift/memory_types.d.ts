//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//
import Int64 = require('node-int64');


export declare class CSpyMemoryBlock {
  data: string;
  status: string;

    constructor(args?: { data: string; status: string; });
  read(input: Object): void;
  write(input: Object): void;
}
