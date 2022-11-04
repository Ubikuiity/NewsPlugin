// Class used to create news file
import { Vault, TFile } from "obsidian";
import { Stats } from "fs";
import * as fsp from 'fs/promises';

export class filecreator {

    saveFileName: string;
    obsVault:Vault;
    nDelay: number;
    nLogo: string;
    detectedNewFiles: Array<TFile> = [];
    markedNewFiles: Array<TFile> = [];

    constructor(fileName: string, cVault: Vault, newsDelay: number, newsLogo: string){
        this.saveFileName = fileName;
        this.obsVault = cVault;
        this.nDelay = newsDelay;
        this.nLogo = newsLogo;
        console.log("creating class filecreator");
	}

    async refreshNews(){
        // Refresh the files detected and ñarked as new

        const basePath = (this.obsVault.adapter as any).basePath;
        const files = this.obsVault.getMarkdownFiles();
        for (let i = 0; i < files.length; i++){
			let fPath: string = files[i].path;
			const pathOfFile :string = basePath + `\\` + fPath
			const modDate: Date = await getModificationDate(pathOfFile);
			const now: Date = new Date();
			// Checking if date of modification is recent
			if (now.getTime() - modDate.getTime() < this.nDelay){
				console.log(`File ${fPath} is recent`);
                this.detectedNewFiles.push(files[i]);
			}
      
			const content :string = await this.obsVault.cachedRead(files[i]);
			
            // this part needs to be done again, the marked file detection is not accurate
			if (content.search(this.nLogo) != -1){
				console.log(`Found marked new file : ${fPath}`)
                this.markedNewFiles.push(files[i]);
			}
		}
    }


}

// Function that gets last modification date of file
async function getModificationDate(pathToExplore: string): Promise<Date>{
	const stats: Stats = await fsp.stat(pathToExplore);
	return stats.mtime;
}
