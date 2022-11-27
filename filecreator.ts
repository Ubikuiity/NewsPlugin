// Class used to create news file
import { Vault, TFile } from "obsidian";
import { Stats } from "fs";
import * as fsp from 'fs/promises';
import { Settings } from "settingsClass";
import NewsPlugin from "main";
import * as path from "path";

export class fileCreator {

    mainPlugin: NewsPlugin
    obsVault: Vault;
    pSettings: Settings;

    detectedNewFiles: Array<TFile> = [];
    markedNewFiles: Array<TFile> = [];
    pointedNewFiles: Array<string> = [];  // This contains strings : the links to pointed files [[XXX]]
    pointerToNewFiles: Array<TFile> = [];

    templateTags: Array<string>;
    templateSplitedText: Array<string>;
    
    newsData: string;

    /**
     * Class qui construit le fichier News
     * 
     * @param plugin Main plugin
     */
    constructor(plugin: NewsPlugin) {
        this.mainPlugin = plugin;
        this.obsVault = plugin.app.vault;
        this.pSettings = plugin.settings;
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

    // first to go, Refresh the files detected, marked and pointed as new
    async refreshNews() {
        console.log(`refreshing files detected and marked ...`);

        // Reseting new files arrays
        this.detectedNewFiles = [];
        this.markedNewFiles = [];
        this.pointedNewFiles = [];
        this.pointerToNewFiles = [];

        const basePath = (this.obsVault.adapter as any).basePath;
        const files = this.obsVault.getMarkdownFiles();

        // for all markdown files
        for (let mdFile of files) {
            const fPath: string = mdFile.path;
            if (checkIsNotSpecialPath(fPath, this.pSettings.specialPaths)){

                // This part detects if the file has been modified recently
                const now: Date = new Date();
                if (now.getTime() - mdFile.stat.mtime < this.pSettings.detectNewsDelay * 24 * 60 * 60 * 1000) {
                    this.detectedNewFiles.push(mdFile);
                }

                // This part detects if file is marked as new
                if (mdFile.name.includes(this.pSettings.newsLogo)){
                    this.markedNewFiles.push(mdFile);
                }

                // This part detects new pointed files
                const content: string = await this.obsVault.cachedRead(mdFile);

                if (content.includes(this.pSettings.newsLogo)) {
                    // looking for links marked as new in the file
                    const rePattern = new RegExp(`\\[{2}.*${this.pSettings.newsLogo}|${this.pSettings.newsLogo}.*\\]{2}`, "g");
                    const matches = content.matchAll(rePattern);
                    for (let match of matches) {
                        const matchString: string = match[0];

                        const rePattern2 = new RegExp(`\\[{2}.*\\]{2}`, "g"); // Regex to get only the link to file
                        const match2 = matchString.match(rePattern2);
                        if (match2) {
                            const newFileLink: string = match2[0];
                            this.pointedNewFiles.push(newFileLink);
                        }
                    }
                    this.pointerToNewFiles.push(mdFile);
                }
            }
        }

        // sort detected files by creation date (most recent are the first of the list)
        const sortableArray = await Promise.all(this.detectedNewFiles.map(async (file: TFile) => {
            return [file.stat.mtime, file]
        }));

        sortableArray.sort((a, b) => {
            return -(a[0] > b[0]) || +(a[0] < b[0]);
        })

        this.detectedNewFiles = sortableArray.map(x => x[1]) as Array<TFile>;

        console.log(`Found new files :
        Detected files : ${this.detectedNewFiles.length}
        Marked files : ${this.markedNewFiles.length}
        Pointed Files : ${this.pointedNewFiles.length}
        Pointer Files : ${this.pointerToNewFiles.length}`);
    }

    // second to go, this reads the template file
    async readTemplateFile() {
        const basePath = (this.obsVault.adapter as any).basePath;
        const pathOfTemplate: string = path.join(basePath, `.obsidian`, `plugins`, this.mainPlugin.manifest.id, `Ressources`, `NewsTemplate.md`);
        const file = await fsp.open(pathOfTemplate);
        const templateContent = (await file.readFile()).toString("utf8");
        console.log(`Template file read`);

        let remainingText: string = templateContent;

        // Detecting files 
        let tags: Array<string> = [];
        let splitedTemplate: Array<string> = [];
        const tagRegex = new RegExp(`%.News%`, "g");  // Regex used to detect tags in template file

        // Not a very elegant part, but detects differents tags in file and progressively splits the text.
        let regexMatch: RegExpMatchArray | null;
        while ((regexMatch = remainingText.match(tagRegex)) !== null) {
            tags.push(regexMatch[0][1]);
            const split: string[] = remainingText.split(regexMatch[0]);
            splitedTemplate.push(split[0]);
            remainingText = split[1];
        }
        splitedTemplate.push(remainingText);
        console.log(`Found tags ${tags} in template files`);

        this.templateTags = tags;
        this.templateSplitedText = splitedTemplate;
    }

    // third to go, this prepares the data to write in the news file
    async createNewsData() {
        let finalData: string = this.templateSplitedText[0];

        for (let tagIndex = 0; tagIndex < this.templateTags.length; tagIndex ++){
            finalData += await this.getTagNewsData(this.templateTags[tagIndex]);
            finalData += this.templateSplitedText[tagIndex + 1];
        }

        this.newsData = finalData;
    }
    
    // fourth to go, this writes the news file
    async writeNewsFile() {
        const basePath = (this.obsVault.adapter as any).basePath;
        const finalSavePath: string = path.join(basePath, this.pSettings.newsFilename);

        console.log(`Writing news file... Path :\n ${finalSavePath}`);
        const data = new Uint8Array(Buffer.from(this.newsData));
        await fsp.writeFile(finalSavePath, data);
    }

    /**
     * Function that creates the text put instead of %.News% depending on what character takes the place of the '.'
     * 
     * @param tag Tag used to specify which news should be displayed here. Tags can be :
     *  - D : Detected News
     *  - M : Marked News
     *  - P : Pointed News
     * @return string that replaces the %.News%
     */
    async getTagNewsData(tag: string): Promise<string> {
        let finalData: string = '';

        switch (tag){
            case 'D': // Detected News (this one adds the date to the news)
                for (let detectedFile of this.detectedNewFiles) {
                    const basePath = (this.obsVault.adapter as any).basePath;
                    const pathOfFile: string = path.join(basePath, detectedFile.path);
                    const modDate: Date = (await fsp.stat(pathOfFile)).mtime;
                    finalData += `${modDate.toString().split("GMT")[0]} : [[${detectedFile.name.split('.')[0]}]]\n`; // adding files paths
                }
                return finalData;
            case 'M': // Marked news
                for (let markedFile of this.markedNewFiles) {
                    finalData += `[[${markedFile.name.split('.')[0]}]]\n`; // adding files paths
                }
                return finalData;
            case 'P': // Pointed news, bit different function as pointedNewFiles do not have the same format as other newsFile Array
                for (let pointedFile of this.pointedNewFiles) {
                    finalData += pointedFile + `\n`; // adding files paths
                }
                return finalData;
            default:
                console.log(`Unexpected tag found : ${tag}`);
                return finalData;
        }
    }
}


/**
 * Check if path contains any string found in specialPathes. Returns true if the path is not a special path,
 * else returns false.
 * 
 * @param path string. Path to check.
 * @param specialPathes string[]. Array of special pathes.
 */
function checkIsNotSpecialPath(path: string, specialPathes: Array<string>): boolean{
    for (let specialPath of specialPathes){
        if (specialPath != '')  // Check that specialPath is not empty string, other all pathes will be marked as special
        {
            if (path.includes(specialPath)){
                return false;
            }
        }
    }
    return true;
}
