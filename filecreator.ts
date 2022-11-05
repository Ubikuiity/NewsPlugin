// Class used to create news file
import { Vault, TFile } from "obsidian";
import { Stats } from "fs";
import * as fsp from 'fs/promises';
import { fileURLToPath } from "url";

export class fileCreator {

    saveFileName: string;
    obsVault: Vault;
    nDelay: number;
    nLogo: string;
    detectedNewFiles: Array<TFile> = [];
    markedNewFiles: Array<TFile> = [];

    templateStructure: string;
    newsData: string;

    /**
     * Class qui construit le fichier News
     * 
     * @param fileName - string, nom du fichier news qui sera crée
     * @param cVault - Vault actuel
     * @param newsDelay - parametre newsDelay du plugin
     * @param newsLogo - parametre newsLogo du plugin
     * 
     */
    constructor(fileName: string, cVault: Vault, newsDelay: number, newsLogo: string) {
        this.saveFileName = fileName;
        this.obsVault = cVault;
        this.nDelay = newsDelay;
        this.nLogo = newsLogo;
        console.log("creating class filecreator");
    }

    /**
     * Function used to refresh the detected news, read the template file, prepare the content to write and write the news file.
     * 
     * This function synthesize the work of this class.
     */
    async synchroAll() {
        await this.refreshNews();
        await this.readTemplateFile();
        await this.createNewsData();
        await this.writeNewsFile();
    }

    // first to go
    async refreshNews() {
        // Refresh the files detected and marked as new
        console.log(`refreshing files detected and marked ...`);

        // Reseting new files
        this.detectedNewFiles = [];
        this.markedNewFiles = [];

        const basePath = (this.obsVault.adapter as any).basePath;
        const files = this.obsVault.getMarkdownFiles();
        for (let i = 0; i < files.length; i++) {
            const fPath: string = files[i].path;
            const pathOfFile: string = basePath + `\\` + fPath
            const modDate: Date = await getModificationDate(pathOfFile);
            const now: Date = new Date();
            // Checking if date of modification is recent
            if (now.getTime() - modDate.getTime() < this.nDelay) {
                // console.log(`File ${fPath} is recent`);
                this.detectedNewFiles.push(files[i]);
            }

            const content: string = await this.obsVault.cachedRead(files[i]);

            // this part needs to be done again, the marked file detection is not accurate
            if (content.search(this.nLogo) != -1) {
                // console.log(`Found marked new file : ${fPath}`)
                this.markedNewFiles.push(files[i]);
            }
        }

        // sort detected files by creation date (most recent are the first of the list)

        const sortableArray = await Promise.all(this.detectedNewFiles.map(async (file: TFile) => {
            const fPath: string = basePath + `\\` + file.path;
            const fDate: Date = await getModificationDate(fPath);
            return [fDate.getTime(), file];
        }));

        sortableArray.sort((a, b) => {
            return -(a[0] > b[0]) || +(a[0] < b[0]);
        })

        this.detectedNewFiles = sortableArray.map(x => x[1]);
    }

    // fourth to go
    async writeNewsFile() {
        const basePath = (this.obsVault.adapter as any).basePath;
        const finalSavePath: string = basePath + `\\` + this.saveFileName;

        console.log(`Writing news file... Path :\n ${finalSavePath}`);
        const data = new Uint8Array(Buffer.from(this.newsData));
        await fsp.writeFile(finalSavePath, data);
    }

    // second to go
    async readTemplateFile() {
        const basePath = (this.obsVault.adapter as any).basePath;
        const pathOfTemplate: string = basePath + `\\.obsidian\\plugins\\FirstPlugin\\Ressources\\NewsTemplate.md`;
        const file = await fsp.open(pathOfTemplate);
        this.templateStructure = (await file.readFile()).toString("utf8");
        console.log(`Template file read`);
    }

    // third to go
    async createNewsData() {
        let finalData: string = ``;

        // Detecting the marked news tag
        if (this.templateStructure.includes("%MNews%")) {
            const split1: string[] = this.templateStructure.split("%MNews%");
            var part1: string = split1[0];
            var part2: string = split1[1];
            // console.log(`First split split1 : ${part1} \n split2 : ${part2}`)
        }
        else {
            throw `Template file doesn't contains the %MNews% tag`;
        }

        // if part1 contains the detected news tag
        if (part1.includes("%DNews%")) {
            const split2: string[] = part1.split("%DNews%");
            // console.log(`split1 : ${split2[0]} \n split2 : ${split2[1]}`)
            finalData += split2[0]; // adding template part 1
            for (let i = 0; i < this.detectedNewFiles.length; i++) {
                const basePath = (this.obsVault.adapter as any).basePath;
                const pathOfFile: string = basePath + `\\` + this.detectedNewFiles[i].path;
                const modDate: Date = await getModificationDate(pathOfFile);
                finalData += `${modDate.toString().split("GMT")[0]} : [[${this.detectedNewFiles[i].name}]]\n`; // adding files paths
            }

            finalData += split2[1]; // adding template part 2
            for (let i = 0; i < this.markedNewFiles.length; i++) {
                finalData += `[[${this.markedNewFiles[i].name}]]\n`; // adding files paths
            }

            finalData += part2; // adding template part 3 (part 2 of split 1)
        }

        // if part2 contains the detected news tag
        else if (part2.includes("%DNews%")) {
            const split2: string[] = part2.split("%DNews%");
            // console.log(`split1 : ${split2[0]} \n split2 : ${split2[1]}`)
            finalData += part1; // adding template part 1
            for (let i = 0; i < this.markedNewFiles.length; i++) {
                finalData += `[[${this.markedNewFiles[i].name}]]\n`; // adding files paths
            }

            finalData += split2[0]; // adding template part 2
            for (let i = 0; i < this.detectedNewFiles.length; i++) {
                const basePath = (this.obsVault.adapter as any).basePath;
                const pathOfFile: string = basePath + `\\` + this.detectedNewFiles[i].path;
                const modDate: Date = await getModificationDate(pathOfFile);
                finalData += `${modDate.toString().split("GMT")[0]} : [[${this.detectedNewFiles[i].name}]]\n`; // adding file paths
            }
            finalData += split2[1]; // adding template part 3
        }

        else {
            throw `Template file doesn't contains the %DNews% tag`;
        }

        this.newsData = finalData;
    }
}

// Function that gets last modification date of file
async function getModificationDate(pathToExplore: string): Promise<Date> {
    const stats: Stats = await fsp.stat(pathToExplore);
    return stats.mtime;
}
