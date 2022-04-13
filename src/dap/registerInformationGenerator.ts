import * as Debugger from "iar-vsc-common/thrift/bindings/Debugger";
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs";
import { create } from "xmlbuilder2";
import { tmpdir } from "os";
import { ThriftClient } from "iar-vsc-common/thrift/thriftClient";
import { NamedLocation } from "iar-vsc-common/thrift/bindings/cspy_types";
import Int64 = require("node-int64");

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

/** {@link NamedLocation} contains Buffers and Int64s, which can't be json-ified and then parsed without changing the structure of the data */
interface SerializableNamedLocation {
    name: string,
    nameAlias: string,
    description: string,
    readonly: boolean,
    writeonly: boolean,
    fullBitSize: number,
    realLocation: {
        address: string,
        zone: number,
    },
    masks: Array<{
        used: boolean,
        mask: string,
    }>,
}

interface RegisterGroup {
    name: string,
    registers: Array<{
        location: SerializableNamedLocation;
        fields: Array<SerializableNamedLocation>;
    }>,
}

// The data we get from cspyserver (e.g. getRegisterGroups, getLocationNames)
export interface CspyRegisterData {
    peripheralRegisterGroups: RegisterGroup[];
    cpuRegisterGroups: Array<{
        name: string,
        registers: string[],
    }>;
}


/**
 * Functions for retrieving register information for a device. This includes both cpu registers and peripheral registers.
 * Generating this information can be slow, so we try to cache it for when the same device is debugged again.
 */
export class RegisterInformationGenerator {
    private readonly registerInfo: Promise<CspyRegisterData>;
    // A unique identifier to use when loading or storing cached data for this session.
    private readonly cacheId: string;

    /**
     * Creates a new generator.
     * @param driverOptions The C-SPY backend args used for the session.
     * @param dbgr The debugger service running the session.
     */
    constructor(driverOptions: string[], dbgr: ThriftClient<Debugger.Client>) {
        // We identify identical "devices" by hashing all driver options. It might be more accurate to try to parse
        // out e.g. the device-description file, but that would also be more error-prone.
        this.cacheId = crypto.createHash("md5").update(driverOptions.sort().join(", ")).digest("hex");

        // Try to fetch cached register information, or generate it if it's not available.
        if (fs.existsSync(this.getCacheFile())) {
            this.registerInfo = Promise.resolve(JSON.parse(fs.readFileSync(this.getCacheFile()).toString()));
            dbgr.close();
        } else {
            this.registerInfo = RegistersHelpers.generateRegisterInformation(dbgr.service);
            this.registerInfo.then(regData => {
                fs.promises.mkdir(path.dirname(this.getCacheFile()), { recursive: true });
                fs.promises.writeFile(this.getCacheFile(), JSON.stringify(regData));
                dbgr.close();
            });
        }
    }

    /**
     * Gets the cpu registers for the device being debugged by the current sesssion.
     * CPU registers are organized into groups as seen e.g. in the registers EW window.
     */
    async getCpuRegisterGroups(): Promise<Array<{ name: string, registers: string[] }>> {
        const registerInfo = await this.registerInfo;
        return registerInfo.cpuRegisterGroups;
    }

    /**
     * Generates svd-format data for the device being debugged by the current session.
     * The svd data will not necessarily describe the device fully, this function only guarantees correct register information.
     * Resolves to undefined if there are no peripheral registers.
     */
    async getSvdXml(): Promise<string | undefined> {
        const registerInfo = await this.registerInfo;

        // Format the data into an svd device
        const svdData = RegistersHelpers.createSvdDevice(registerInfo.peripheralRegisterGroups);
        if (svdData.peripherals.peripheral.length === 0) {
            return undefined;
        }
        const xmlDomRoot = create({device: svdData});
        // convert the XML tree to string
        const xml = xmlDomRoot.end({ prettyPrint: true });
        return xml;
    }

    private getCacheFile() {
        return path.join(tmpdir(), "iar-vsc-registercache", this.cacheId + ".json");
    }

}

// Implementations
namespace RegistersHelpers {
    /**
     * Generates information about the registers available for the device being debugged by the given session.
     */
    export async function generateRegisterInformation(dbgr: Debugger.Client): Promise<CspyRegisterData> {
        // Create a tree of register groups, registers and register fields.
        const groupNames = await dbgr.getRegisterGroups();
        const groups: Array<{name: string, registers: string[]}> = [];
        await Promise.all(groupNames.map(async(group) => {
            // Note that getLocationNamesInGroup is _very_ slow on debug flavored EWs, especially for devices with lots of registers.
            groups.push({name: group, registers: await dbgr.getLocationNamesInGroup(group)});
        }));

        const fieldsInRegisters = new Map<string, string[]>();
        const allLocations = await dbgr.getLocationNames();
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

        const allGroups: RegisterGroup[] = [];

        await Promise.all(groups.map(async(group) => {
            allGroups.push({
                name: group.name,
                registers: await Promise.all(group.registers.map(async(reg) => {
                    const fieldNames = fieldsInRegisters.get(reg) ?? [];
                    return {
                        location: RegistersHelpers.toSerializable(await dbgr.getNamedLocation(reg)),
                        fields: await Promise.all(fieldNames.map(async(field) => {
                            return RegistersHelpers.toSerializable(await dbgr.getNamedLocation(field));
                        })),
                    };
                })),
            });
        }));

        // Split into cpu and peripheral registers
        return RegistersHelpers.partitionRegisters(allGroups);
    }


    // Partitions registers into cpu registers and peripheral (memory-mapped) registers,
    // while preserving the group hierarchy.
    export function partitionRegisters(groups: RegisterGroup[]): CspyRegisterData {
        const groupsCopy: RegisterGroup[] = JSON.parse(JSON.stringify(groups));
        let cpuGroups = groupsCopy.map(group => {
            return {
                name: group.name,
                // Remove registers that have a location in memory
                registers: group.registers.filter(register => register.location.realLocation.zone !== 0).
                    map(register => register.location.name),
            };
        });
        cpuGroups = cpuGroups.filter(group => group.registers.length > 0);

        groups.forEach(group => {
            // Remove registers that *do not* have a location in memory
            group.registers = group.registers.filter(register => register.location.realLocation.zone === 0);
        });
        groups = groups.filter(group => group.registers.length > 0);
        return {
            cpuRegisterGroups: cpuGroups,
            peripheralRegisterGroups: groups,
        };
    }

    export function createSvdDevice(groups: RegisterGroup[]): SvdDevice {
        return {
            name: "Auto-Generated",
            addressUnitBits: 8,
            width: 32,
            resetValue: "0",
            peripherals: { peripheral: groups.map(group => {
                const baseAddress = group.registers.reduce((currentMin, register) => {
                    const addressBuf = Buffer.from(register.location.realLocation.address, "hex");
                    return currentMin.compare(addressBuf) === -1 ? currentMin : addressBuf;
                }, Buffer.from("ffffffffffffffff", "hex"));
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

    function createSvdRegister(register: { location: SerializableNamedLocation, fields: Array<SerializableNamedLocation> }, baseAddress: bigint): SvdRegister {
        const addrOffset = BigInt("0x" + register.location.realLocation.address) - baseAddress;
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
                        return [Math.min(lsb, getLeastSignificantBit(new Int64(mask.mask).buffer)), Math.max(msb, getMostSignificantBit(new Int64(mask.mask).buffer))];
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

    export function toSerializable(location: NamedLocation): SerializableNamedLocation {
        return {
            ...location,
            realLocation: {
                address: location.realLocation.address.toString(16),
                zone: location.realLocation.zone.id,
            },
            masks: location.masks.map(mask => {
                return { used: mask.used, mask: mask.mask.toOctetString() };
            }),
        };
    }
}