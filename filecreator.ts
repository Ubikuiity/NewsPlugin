// Class used to create news file
import { Vault, TFile } from "obsidian";
import * as fsp from 'fs/promises';
import { Settings } from "settingsClass";
import NewsPlugin from "main";
import * as path from "path";

// This interface is needed to represent a link in a file
export class fileLink {
    pointedFile: TFile;  // The file being linked
    linkString: string;  // The string that contains the link to the file
    originalFile: TFile;  // The file containing the link

    /**
     * Class used to contruct the link object
     * 
     * @param pFile file being pointed by the link
     * @param linkString string of the link [[XXXXX]]
     * @param oFile file containing the link
     */
     constructor(pFile: TFile, linkString: string, oFile: TFile) {
        this.pointedFile = pFile;
        this.linkString = linkString;
        this.originalFile = oFile;
    }
}

export class fileCreator {

    mainPlugin: NewsPlugin;
    obsVault: Vault;
    pSettings: Settings;

    detectedNewFiles: Array<TFile> = [];
    markedNewFiles: Array<TFile> = [];
    pointedNewFiles: Array<fileLink> = [];
    pointerToNewFiles: Array<TFile> = [];

    templateTags: Array<string>;
    templateSplitedText: Array<string>;
    
    newsData: string;

    /**
     * Class used to contruct the news file.
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

    /**
     * This function refreshes the members detectedNewFiles, markedNewFiles, pointedNewFiles and pointerToNewFiles
     * by going through all the files and looking all news. This function can be quite expensive for big vaults
     */
    async refreshNews() {
        console.log(`refreshing files detected and marked ...`);

        // Reseting new files arrays
        this.detectedNewFiles = [];
        this.markedNewFiles = [];
        this.pointedNewFiles = [];
        this.pointerToNewFiles = [];

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

                // This part detects new pointed files by looking for links marked as new in the file
                const content: string = await this.obsVault.cachedRead(mdFile);

                if (content.includes(this.pSettings.newsLogo)) {
                    // looking for links marked as new in the file
                    const rePattern = new RegExp(`\\[{2}.*\\]{2}.*${this.pSettings.newsLogo}|${this.pSettings.newsLogo}.*\\[{2}.*\\]{2}`, "g");
                    const matches = content.matchAll(rePattern);
                    for (let match of matches) {
                        const matchString: string = match[0];

                        const rePattern2 = new RegExp(`\\[{2}.*\\]{2}`, "g"); // Regex to get only the link to file
                        const match2 = matchString.match(rePattern2);
                        if (match2) {
                            const newFileLink: string = match2[0];
                            const fileName: string = getFileNameFromLink(newFileLink);
                            let file;
                            if ((file = this.getFileFromName(fileName)) != null) {
                                this.pointedNewFiles.push(new fileLink(file, newFileLink, mdFile));
                            }
                            else{
                                console.warn(`Error while reading ${newFileLink}.\n` +
                                        `Search for file '${fileName}' didn't succeed.\n`);
                            }
                        }
                    }
                    this.pointerToNewFiles.push(mdFile);
                }
            }
        }

        // Now sorting arrays by modification date (most recent are the first of the list)
        // Sorting Pointed files (links)

        const pointedSortableArray = this.pointedNewFiles.map((link: fileLink) => {
            return [link.pointedFile.stat.mtime, link]
        });

        pointedSortableArray.sort((a, b) => {
            return -(a[0] > b[0]) || +(a[0] < b[0]);
        })

        this.pointedNewFiles = pointedSortableArray.map(x => x[1]) as Array<fileLink>;

        // Sorting Detected files
        const detectedSortableArray = this.detectedNewFiles.map((file: TFile) => {
            return [file.stat.mtime, file]
        });

        detectedSortableArray.sort((a, b) => {
            return -(a[0] > b[0]) || +(a[0] < b[0]);
        })

        this.detectedNewFiles = detectedSortableArray.map(x => x[1]) as Array<TFile>;

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
		// TODO This part needds to be rewritten as it can lead to unexpeccted behaviour if the template file includes multiple times the same tag 
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
        const basePath = (this.obsVault.adapter as any).basePath;

        switch (tag){
            case 'D': // Detected News (this one adds the date to the news)
                for (let detectedFile of this.detectedNewFiles) {
                    const pathOfFile: string = path.join(basePath, detectedFile.path);
                    const modDate: Date = (await fsp.stat(pathOfFile)).mtime;
                    finalData += `${this.chooseDateFormat(modDate)}[[${detectedFile.name.split('.')[0]}]]\r\n`; // adding files paths
                }
                return finalData;
            case 'M': // Marked news
                for (let markedFile of this.markedNewFiles) {
                    const pathOfFile: string = path.join(basePath, markedFile.path);
                    const modDate: Date = (await fsp.stat(pathOfFile)).mtime;
                    finalData += `${this.chooseDateFormat(modDate)}[[${markedFile.name.split('.')[0]}]]\r\n`; // adding files paths
                }
                return finalData;
            case 'P': // Pointed news, bit different function as pointedNewFiles do not have the same format as other newsFile Array
                for (let pointedLink of this.pointedNewFiles) {
                    const pathOfFile: string = path.join(basePath, pointedLink.pointedFile.path);
                    const modDate: Date = (await fsp.stat(pathOfFile)).mtime;
                    finalData += `${this.chooseDateFormat(modDate)}${pointedLink.linkString}\r\n`; // adding files paths
                }
                return finalData;
            default:
                console.log(`Unexpected tag found : ${tag}`);
                return finalData;
        }
    }

    getFileFromName(nameOfFile: string): TFile | null{
        for (let mdFile of this.obsVault.getMarkdownFiles()){
            const nameOfMdFile = mdFile.name.slice(0, mdFile.name.lastIndexOf('.'));  // Removes the .md at the end of the name
            if (nameOfMdFile == nameOfFile){
                return mdFile
            }
        }
        return null;
    }

    /**
     * Change date format according to tag given in parameters of plugin.
     * 
     * @param date date to be formatted
     */
    chooseDateFormat(date: Date){
        switch (this.pSettings.dateFormat){
            case 'N':
                return '';
            case 'D':
                return `${date.toLocaleDateString()} : `;
            case 'DH':
                return `${date.toLocaleString()} : `;
            case 'DOW':
                return `${date.toString().split('GMT')[0]}: `;
            default:
                return '';
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

function getFileNameFromLink(fileLink: string): string{
    let res: string = fileLink;
    res = res.replace(/[\[\]]/g, '');
    // [[XXX/XXX/Y|I like this file]] -> XXX/XXX/Y|I like this file
    res = res.split('|')[0];
    // XXX/XXX/Y|I like this file -> XXX/XXX/Y
    res = res.split('/').pop() as string;
    // XXX/XXX/Y -> Y
    res = res.split(`\\`).pop() as string;
    // Y -> Y  (Has no effect here, but useful if there are some \ in the path)
    return res
}
