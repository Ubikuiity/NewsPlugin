import { ItemView, ListItemCache, TFile, WorkspaceLeaf } from "obsidian";
import * as fsp from 'fs/promises';
import { fstat, FSWatcher, Stats } from 'fs';

export const NEWS_PAGE_TYPE = "NEWS_VIEW_PAGE";

export class NewsView extends ItemView {
  newsLogo: string;
  newsDelay: number;

  constructor(leaf: WorkspaceLeaf, logo: string, delay: number) {
    super(leaf);
    this.newsLogo = logo;
    this.newsDelay = delay;
  }

  getViewType() {
    return NEWS_PAGE_TYPE;
  }

  getDisplayText() {
    return "News";
  }

  async onOpen() {

    // Looking for new files or marked files
    let detectedNewFiles: Array<TFile> = [];
    let markedNewFiles: Array<TFile> = [];
    
		// iterates over all files, get their modification dates and check if they contains the new icon
		const basePath = (this.app.vault.adapter as any).basePath;
		const files = this.app.vault.getMarkdownFiles();
		for (let i = 0; i < files.length; i++){
			let fPath: string = files[i].path;
			const pathOfFile :string = basePath + `\\` + fPath
			const modDate: Date = await getModificationDate(pathOfFile);
			const now: Date = new Date();
			// Checking if date of modification is recent
			if (now.getTime() - modDate.getTime() < this.newsDelay){
				console.log(`File ${fPath} is recent`);
        detectedNewFiles.push(files[i]);
			}

			const content :string = await this.app.vault.cachedRead(files[i]);
			
			if (content.search(this.newsLogo) != -1){
				console.log(`Found marked new file : ${fPath}`)
        markedNewFiles.push(files[i]);
			}
		}

    // Handle diplay
    const container = this.containerEl.children[1];
    container.empty();
    container.createEl("h4", { text: "Marked news" });
    for (let i = 0; i < markedNewFiles.length; i++) {
      container.createEl("div", { text: `${markedNewFiles[i].path} marked as new 
        [[${markedNewFiles[i].path.split('.')[0]}]]\n` });
    }

    container.createEl("h4", { text: `${detectedNewFiles.length} Detected news` });
    for (let i = 0; i < detectedNewFiles.length; i++) {
      container.createEl("div", { text: `${detectedNewFiles[i].path} detected as new
        [[${detectedNewFiles[i].path.split('.')[0]}]]\n` });
    }
  }

  async onClose() {
    // Nothing to clean up.
  }
}

// Function that gets last modification date of file
async function getModificationDate(pathToExplore: string): Promise<Date>{
	const stats: Stats = await fsp.stat(pathToExplore);
	return stats.mtime;
}