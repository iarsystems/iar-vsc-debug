
import {platform} from "os";
import * as Path from "path";

/**
 * This is a general class used of OS specific knownledge about a CSpySession.
 */
export class CspyOsUtils{

	static isWindows(){
		return platform() === "win32";
	}

	/**
	 *	Resolve a shared library to the active os from the target.
	 * @param workbenchPath
	 * @param targetName
	 * @param libraryBasename
	 * @returns
	 */
	static resolveTargetLibrary(workbenchPath: string, targetName: string, libraryBasename: string){
		var libName:string = libraryBasename;
		const slPre = this.isWindows() ? targetName : "lib" + targetName;
		const slExt = this.isWindows() ? ".dll" : ".so";

        if(!libName.startsWith(slPre)){
			libName = slPre + libName;
        }

		if(!libName.endsWith(slExt)){
			libName = libName + slExt;
        }

		return Path.join(workbenchPath,targetName.toLowerCase(),"bin", libName);
	}
}