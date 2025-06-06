/// <reference path="HeartbeatService.d.ts" />
//
// Autogenerated by Thrift Compiler (0.14.0)
//
// DO NOT EDIT UNLESS YOU ARE SURE THAT YOU KNOW WHAT YOU ARE DOING
//

import Int64 = require('node-int64');

import { ampsync } from "./ampsync_types";


export declare class Client extends HeartbeatService.Client {
  input: Thrift.TJSONProtocol;
  output: Thrift.TJSONProtocol;
  seqid: number;

  constructor(input: Thrift.TJSONProtocol, output?: Thrift.TJSONProtocol);

  GetAllPartners(): Q.Promise<PartnerInformation[]>;

  GetAllPartners(callback?: (data: PartnerInformation[])=>void): void;

  GetPartnerInfo(who: number): Q.Promise<PartnerInformation>;

  GetPartnerInfo(who: number, callback?: (data: PartnerInformation)=>void): void;

  AcknowledgePartnerIsAlive(myId: number): Q.Promise<void>;

  AcknowledgePartnerIsAlive(myId: number, callback?: (data: void)=>void): void;

  IsPartnerAlive(who: number): Q.Promise<boolean>;

  IsPartnerAlive(who: number, callback?: (data: boolean)=>void): void;

  SetPartnerInfo(information: PartnerInformation): Q.Promise<void>;

  SetPartnerInfo(information: PartnerInformation, callback?: (data: void)=>void): void;

  SetAllPartners(allPartners: PartnerInformation[]): Q.Promise<void>;

  SetAllPartners(allPartners: PartnerInformation[], callback?: (data: void)=>void): void;
}
