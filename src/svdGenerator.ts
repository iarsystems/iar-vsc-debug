import { DEBUGEVENT_SERVICE, DEBUGGER_SERVICE, NamedLocation, SessionConfiguration } from "./dap/thrift/bindings/cspy_types";
import { ThriftServiceManager } from "./dap/thrift/thriftServiceManager";
import * as Debugger from "./dap/thrift/bindings/Debugger";
import * as DebugEventListener from "./dap/thrift/bindings/DebugEventListener";
import { CSpyLaunchRequestArguments } from "./dap/cspyDebug";
import { LaunchArgumentConfigurationResolver } from "./dap/configresolution/launchArgumentConfigurationResolver";
import { create } from "xmlbuilder2";
import { DebugEventListenerHandler } from "./dap/debugEventListenerHandler";

/**
 * Functions for generating and handling System View Description (SVD) data to describe a device and its peripherals.
 */
export namespace SvdGenerator {

    // SVD format specification: https://www.keil.com/pack/doc/CMSIS/SVD/html/svd_Format_pg.html
    export interface SvdDevice {
        name: string,
        addressUnitBits: number,
        width: number,
        resetValue: string,
        peripherals: {
            peripheral: Array<{
                name: string,
                description: string,
                baseAddress: string,
                registers: { register: Array<SvdRegister> },
            }>,
        };
    }
    export interface SvdRegister {
        name: string,
        displayName: string,
        description: string,
        addressOffset: string,
        size: number,
        access: string,
        fields: {
            field: Array<{
                name: string,
                description: string,
                lsb: number,
                msb: number,
            }>,
        },
    }

    // The data we get from cspyserver (e.g. getRegisterGroups, getLocationNames)
    interface CspyRegisterData {
        groups: Array<{
            name: string,
            registers: Array<{
                location: NamedLocation;
                fields: Array<NamedLocation>;
            }>;
        }>;
    }

    /**
     * Generates svd-format data for a device by starting a temporary cspyserver session.
     * The svd data returned will describe the device specified by the supplied launch arguments.
     * The svd data will not necessarily describe the device fully, this function only guarantees correct register information.
     */
    export async function generateSvd(args: CSpyLaunchRequestArguments): Promise<SvdDevice> {
        const sessionConfig: SessionConfiguration = await new LaunchArgumentConfigurationResolver().resolveLaunchArguments(args);

        // Start the session. We need an event listener, otherwise cspyserver won't start the session.
        const cspyServer = await ThriftServiceManager.fromWorkbench(args.workbenchPath);
        const cspyDebugger = await cspyServer.findService(DEBUGGER_SERVICE, Debugger);
        const cspyEventHandler = new DebugEventListenerHandler();
        await cspyServer.startService(DEBUGEVENT_SERVICE, DebugEventListener, cspyEventHandler);
        await cspyDebugger.service.startSession(sessionConfig);

        // Create a tree of register groups, registers and register fields.
        const groupNames = await cspyDebugger.service.getRegisterGroups();
        const groups: Array<{name: string, registers: string[]}> = [];
        await Promise.all(groupNames.map(async(group) => {
            // Note that getLocationNamesInGroup is _very_ slow on debug flavored EWs, especially for devices with lots of registers.
            groups.push({name: group, registers: await cspyDebugger.service.getLocationNamesInGroup(group)});
        }));

        const fieldsInRegisters = new Map<string, string[]>();
        const allLocations = await cspyDebugger.service.getLocationNames();
        allLocations.forEach(locationName => {
            const parts = locationName.split(".");
            const reg = parts[0];
            const field = parts[1];
            if (!reg || !field) {
                return;
            }
            if (!fieldsInRegisters.has(reg)) {
                fieldsInRegisters.set(reg, []);
            }
            fieldsInRegisters.get(reg)?.push(locationName);
        });

        const rawData: CspyRegisterData = {
            groups: [],
        };

        await Promise.all(groups.map(async(group) => {
            rawData.groups.push({
                name: group.name,
                registers: await Promise.all(group.registers.map(async(reg) => {
                    const fieldNames = fieldsInRegisters.get(reg) ?? [];
                    return {
                        location: await cspyDebugger.service.getNamedLocation(reg),
                        fields: await Promise.all(fieldNames.map(field => {
                            return cspyDebugger.service.getNamedLocation(field);
                        })),
                    };
                })),
            });
        }));

        // Remove cpu registers
        const filtered = filterRawData(rawData);

        // Format the data into an svd device
        const svdData = createSvdDevice(filtered, cspyDebugger.service);
        cspyDebugger.dispose();
        await cspyServer.dispose();
        return svdData;
    }

    /** Create an xml string from an svd device. */
    export function toSvdXml(svdData: SvdDevice): string {
        const root = create({device: svdData});

        // convert the XML tree to string
        const xml = root.end({ prettyPrint: true });
        return xml;
    }


    // Filters out CPU registers (only memory-mapped registers can be described in SVD format),
    // and filters out empty groups.
    function filterRawData(data: CspyRegisterData): CspyRegisterData {
        data.groups.forEach(group => {
            group.registers = group.registers.filter(register => register.location.realLocation.zone.id === 0);
        });
        data.groups = data.groups.filter(group => group.registers.length > 0);
        return data;
    }

    async function createSvdDevice(data: CspyRegisterData, dbgr: Debugger.Client): Promise<SvdDevice> {
        return {
            name: "Auto-Generated",
            addressUnitBits: (await dbgr.getZoneById(0)).bitsPerUnit,
            width: 32,
            resetValue: "0",
            peripherals: { peripheral: data.groups.map(group => {
                const baseAddress = group.registers.reduce((currentMin, register) => currentMin.compare(register.location.realLocation.address.buffer) === -1 ? currentMin : register.location.realLocation.address.buffer, Buffer.from("ffffffffffffffff", "hex"));
                const baseAddressInt = BigInt("0x" + baseAddress.toString("hex"));
                const registers: SvdRegister[] = group.registers.map(reg => createSvdRegister(reg, baseAddressInt));

                return {
                    name: group.name,
                    description: "",
                    baseAddress: "0x" + baseAddress.toString("hex"),
                    registers: { register: registers },
                };
            })},
        };
    }

    function createSvdRegister(register: { location: NamedLocation, fields: Array<NamedLocation> }, baseAddress: bigint): SvdRegister {
        const addrOffset = BigInt("0x" + register.location.realLocation.address.toString(16)) - baseAddress;
        return {
            name: register.location.name,
            displayName: register.location.nameAlias ? register.location.nameAlias : register.location.name,
            description: register.location.description,
            addressOffset: addrOffset.toString(),
            size: register.location.fullBitSize,
            access: register.location.readonly ? "read-only" : register.location.writeonly ? "write-only" : "read-write",
            fields: { field: register.fields.map(field => {
                let msb: number;
                let lsb: number;
                const usedMasks = field.masks.filter(mask => mask.used);
                if (usedMasks.length > 0) {
                    // cspy supports having multiple bit ranges for a field, but the svd format does not.
                    // Instead we use the largest range that includes all cspy ranges.
                    [lsb, msb] = usedMasks.reduce(([lsb, msb], mask) => {
                        return [Math.min(lsb, getLeastSignificantBit(mask.mask.buffer)), Math.max(msb, getMostSignificantBit(mask.mask.buffer))];
                    }, [register.location.fullBitSize, 0]);
                } else {
                    lsb = 0;
                    msb = register.location.fullBitSize;
                }
                return {
                    name: field.nameAlias ? field.nameAlias : field.name,
                    description: field.description,
                    msb: msb,
                    lsb: lsb,
                };
            })},
        };
    }

    // Returns the index of the least significant 1 bit in a big-endian integer
    function getLeastSignificantBit(buffer: Buffer): number {
        for (let byte = 0; byte < buffer.length; byte++) {
            const byteVal = buffer[buffer.length - 1 - byte];
            if (byteVal !== undefined && byteVal !== 0) {
                const lsbVal = byteVal & -byteVal;
                return 8*byte + Math.log2(lsbVal);
            }
        }
        return 0;
    }
    // Returns the index of the most significant 1 bit in a big-endian integer
    function getMostSignificantBit(buffer: Buffer): number {
        for (let byte = buffer.length - 1; byte >= 0; byte--) {
            const byteVal = buffer[buffer.length - 1 - byte];
            if (byteVal !== undefined && byteVal !== 0) {
                return 8*byte + Math.floor(Math.log2(byteVal));
            }
        }
        return 0;
    }
}