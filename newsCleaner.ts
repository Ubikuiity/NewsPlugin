import NewsPlugin from 'main';
import { TFile, Vault } from "obsidian";
import { Settings } from "settingsClass";
import * as fsp from 'fs/promises';
import { fileCreator } from 'filecreator';
import * as path from "path";

export class newsCleaner {

    mainPlugin: NewsPlugin;
    obsVault: Vault;
    pSettings: Settings;

    constructor(plugin: NewsPlugin) {
        this.mainPlugin = plugin;
        this.obsVault = plugin.app.vault;
        this.pSettings = plugin.settings;
    }

    /**
     * Function that checks all marked and pointed files and remove the icon if they are not new anymore
     */
    async clearNews(){
        console.log(`Cleaning marked or pointed files that are not new anymore...`)
        const fCreator: fileCreator = this.mainPlugin.pageCreator;
        await fCreator.refreshNews(); // This line makes sure files detected as new are up to date

        const basePath = (this.obsVault.adapter as any).basePath;
        const now: Date = new Date();

        // Handle marked new files
        let listOfOldNames: Array<string> = [];
        let listOfNewNames: Array<string> = [];

        let count: number = 0;
        for (let mdFile of fCreator.markedNewFiles){
            const modDate = mdFile.stat.mtime;
            if (now.getTime() - modDate > this.pSettings.rmNewsDelay * 24 * 60 * 60 * 1000){  // if file is not new anymore
                const rePattern: RegExp = new RegExp(` *${this.pSettings.newsLogo} *`, "g");  // Regex to find news icon and spaces around it
                const newName: string = mdFile.name.replace(rePattern, '');
                const newPath: string = path.join(basePath, path.dirname(mdFile.path), newName);

                const oldPath = path.join(basePath, mdFile.path);

                try {
                    await fsp.access(oldPath);  // If path exists, execute next line
                    await fsp.rename(oldPath, newPath);  // rename old file to new file name
                    listOfOldNames.push(mdFile.name.split('.')[0]);
                    listOfNewNames.push(newName.split('.')[0]);
                    count ++;
                } catch {
                    console.warn(`Unexpected error happened while trying to rename file ${oldPath} to ${newPath}`)
                }
            }
        }
        console.log(`Finished working with marked files, removed news marker from ${count} files`);

        console.log(`Now renaming links in vault to match the new file names... This might take some time`)
        const result = await this.changeAllLinks(listOfOldNames, listOfNewNames);
        console.log(`Changed ${result[0]} files for a total of ${result[1]} links`);

        count = 0;
        // Handle pointed files
        for (let pointerFile of fCreator.pointerToNewFiles){
            let content: string = await this.obsVault.cachedRead(pointerFile);

            // looking for links marked as new in the file
            const rePattern = new RegExp(`\\[{2}.*${this.pSettings.newsLogo}|${this.pSettings.newsLogo}.*\\]{2}`, "g"); // Regex pattern
            const matches = content.matchAll(rePattern);

            let shift: number = 0;  // Shift introduces by the removal elements of content (the news icon)

            for (let match of matches) {
                const matchString: string = match[0];  // This is the first match : [[XXX]] {NewsLogo} or {NewsLogo} [[XXX]]

                const rePattern2 = new RegExp(`\\[{2}.*\\]{2}`, "g");  // Regex to get only the link to file : [[XXX]]
                const match2 = matchString.match(rePattern2);
                if (match2) {
                    let newFileLink: string = match2[0];

                    const fileName = getFileNameFromLink(newFileLink);

                    let file;
                    if ((file = this.getFileFromName(fileName)) != null){  // Checking if we can find file
                        if (now.getTime() - file.stat.mtime > this.pSettings.rmNewsDelay * 24 * 60 * 60 * 1000){
                            const logoRegex  = new RegExp(` *${this.pSettings.newsLogo} *`, 'g');  // This regex only gets the news logo and spaces around it
                            for (let logoMatch of match[0].matchAll(logoRegex)){
                                if (match.index && logoMatch.index){  // Making sure matches are defined, which is always the case
                                    // We change content by removing the {NewsLogo} part. As we remove element from content, the shift grows
                                    content = content.slice(0, match.index + logoMatch.index - shift) + content.slice(match.index + logoMatch.index + logoMatch[0].length - shift);
                                    shift += logoMatch[0].length;
                                }
                                else {
                                    throw `Something unexpected happened while reading file ${pointerFile.name}`
                                }
                            }
                        }
                    }
                    else{  // If we didn't find file
                        console.warn(`Coudn't find linked file ${fileName} from ${pointerFile.name}.` +
                            `File might be missing or link weirdly formatted, check that file name doesn't contain a dot`)
                    }
                }
                else{
                    console.warn(`Found weird formatting of file link in file ${pointerFile.name}, skipped link ${matchString}`)
                }
            }

            if (shift > 0){
                // If we remove more than 0 element, rewrite the file
                const fullPathFile: string = path.join(basePath, pointerFile.path);
                rewriteFile(pointerFile, fullPathFile, content);
                count ++;
            }
        }
        console.log(`Finished working with pointed files, removed news marker from ${count} links`)
    }

    /**
     * Function that iterates through all files of the Vault to find the file having the name given as input. Returns null if coudn't find
     * @param nameOfFile name of the file we are looking for 
     * 
     * @return File that has the given name. Or null if file was not found
     */
    getFileFromName(nameOfFile: string): TFile | null{
        for (let mdFile of this.obsVault.getMarkdownFiles()){
            if (mdFile.name.split('.')[0] == nameOfFile){
                return mdFile
            }
        }
        return null;
    }

    /**
     * Function used to recreate links of all files with new links if the pointed file name has been changed. This function can be quite expensive to run.
     * 
     * @param oldNames Old names of files.
     * @param newNames New names of files, index must corresponds witlh oldNames array.
     * 
     * @return [number of file changed, number of links changed].
     */
    async changeAllLinks(oldNames: string[], newNames: string[]){
        // Regex used to find link in file
        const regexList: RegExp[] = oldNames.map((fileName: string): RegExp => {
            return RegExp(`\\[{2}.*${fileName}\\]{2}`, 'g')
        })

        let linkCount: number = 0;
        let fileCount: number = 0;
        for (let mdFile of this.obsVault.getMarkdownFiles()){ // Iterate all file of vault
            let content: string = await this.obsVault.cachedRead(mdFile);

            let linksRenamed: number = 0;
            let index: number = 0;
            for (let linkRegex of regexList){  // For each name that has changed, look for a link in the file
                let match: RegExpMatchArray | null;
                while ((match = content.match(linkRegex)) != null){  // If we found a link
                    const regName = new RegExp(oldNames[index], 'g');
                    content = content.replace(linkRegex, match[0].replace(regName, newNames[index]));  // Replace the link with the new one

                    linksRenamed ++;
                    if (linksRenamed > 1000) {  // Check that we are not in an infinite loop
                        console.warn(`Renamed more than 1000 links in ${mdFile.name}.` +
                            `Stopping while renaming ${oldNames[index]} to ${newNames[index]}`);
                        break
                    };
                }
                index ++;
            }
            if (linksRenamed > 0)  // If we changed more than 1 link, rewrite file
                {
                    // change content of file
                    const pathOfFile = path.join((this.obsVault.adapter as any).basePath, mdFile.path);
                    rewriteFile(mdFile, pathOfFile, content);
                    linkCount += linksRenamed;
                    fileCount ++;
                }
        }
        return [fileCount, linkCount];
    }
}

/**
 * Function that only gets the name of the file in a link. For example, turns [[XXX/XXX/Y|I like this file]] to Y.
 * If the function is used on [[Y]], will return Y.
 * 
 * @param fileLink Link of file as done in Markdown. for example [[XXX/XXX/Y|I like this file]]
 * @returns File name. In our example Y.
 */
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

/**
 * Rewrites a file without changing its modification date
 * 
 * @param file The file object to be modified
 * @param filePath Path of the file to be modified
 * @param content New content to write in file
 */
async function rewriteFile(file: TFile, filePath: string, content: string){
const lastModificationDate = file.stat.mtime; // Keep modification date in memory
const data = new Uint8Array(Buffer.from(content));
await fsp.writeFile(filePath, data);

// Change modification date to put it back as it was before changing the file
await fsp.utimes(filePath, new Date(), new Date(lastModificationDate));
}
