// Class used to create news file
import { Vault, TFile } from "obsidian";
import { Stats } from "fs";
import * as fsp from 'fs/promises';
import { Settings } from "main";

export class fileCreator {

    obsVault: Vault;
    pSettings: Settings;
    detectedNewFiles: Array<TFile> = [];
    markedNewFiles: Array<TFile> = [];
    pointedNewFiles: Array<string> = [];

    templateStructure: string;
    newsData: string;

    /**
     * Class qui construit le fichier News
     * 
     * @param cVault - Vault actuel
     * @param pluginSettings - settings du plugin
     * 
     */
    constructor(cVault: Vault, pluginSettings: Settings) {
        this.obsVault = cVault;
        this.pSettings = pluginSettings;
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
        this.pointedNewFiles = [];

        const basePath = (this.obsVault.adapter as any).basePath;
        const files = this.obsVault.getMarkdownFiles();
        for (let i = 0; i < files.length; i++) {
            const fPath: string = files[i].path;
            const pathOfFile: string = basePath + `\\` + fPath;
            const modDate: Date = await getModificationDate(pathOfFile);
            const now: Date = new Date();
            // Checking if date of modification is recent
            if (now.getTime() - modDate.getTime() < this.pSettings.newsDelay * 24 * 60 * 60 * 1000) {
                // console.log(`File ${fPath} is recent`);
                this.detectedNewFiles.push(files[i]);
            }

            const content: string = await this.obsVault.cachedRead(files[i]);

            // this part needs to be done again, the marked file detection is not accurate
            if (content.search(this.pSettings.newsLogo) != -1) {
                // console.log(`Found marked new file : ${fPath}`)

                const pathMarkedFile: string = basePath + `\\` + fPath;
                const file = await fsp.open(pathMarkedFile);
                const data = (await file.readFile()).toString("utf8");

                // looking for links marked as new in the file
                const rePattern = new RegExp(`\\[{2}.*${this.pSettings.newsLogo}`, "g"); // Regex pattern
                const matches = data.matchAll(rePattern);
                for (const match of matches) {
                    const matchString: string = match[0];
                    // console.log(`Found \n ${matchString}`);
                    const rePattern2 = new RegExp(`\\[{2}.*\\]{2}`, "g");
                    const match2 = matchString.match(rePattern2);
                    if (match2) {
                        const newFileLink: string = match2[0];
                        this.pointedNewFiles.push(newFileLink);
                    }
                }
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

        this.detectedNewFiles = sortableArray.map(x => x[1]) as Array<TFile>;

        console.log(`Found new files :
        Detected files : ${this.detectedNewFiles.length}
        Marked files : ${this.markedNewFiles.length}
        Pointed Files : ${this.pointedNewFiles.length}`);
    }

    // fourth to go
    async writeNewsFile() {
        const basePath = (this.obsVault.adapter as any).basePath;
        const finalSavePath: string = basePath + `\\` + this.pSettings.newsFilename;

        console.log(`Writing news file... Path :\n ${finalSavePath}`);
        const data = new Uint8Array(Buffer.from(this.newsData));
        await fsp.writeFile(finalSavePath, data);
    }

    // second to go, HARD CODED PATH HERE
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
            for (let i = 0; i < this.pointedNewFiles.length; i++) {
                finalData += this.pointedNewFiles[i] + `\n`; // adding files paths
            }

            finalData += part2; // adding template part 3 (part 2 of split 1)
        }

        // if part2 contains the detected news tag
        else if (part2.includes("%DNews%")) {
            const split2: string[] = part2.split("%DNews%");
            // console.log(`split1 : ${split2[0]} \n split2 : ${split2[1]}`)
            finalData += part1; // adding template part 1
            for (let i = 0; i < this.pointedNewFiles.length; i++) {
                finalData += this.pointedNewFiles[i] + `\n`; // adding files paths
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
