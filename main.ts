import { Console } from 'console';
import { fstat, Stats } from 'fs';
import { addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SettingTab } from 'obsidian';
import { text } from 'stream/consumers';

// Remember to rename these classes and interfaces!

let fsp = require('fs/promises')

interface Settings {
	newsLogo: string;
}

const DEFAULT_SETTINGS: Settings = {
	newsLogo: '❄'
}

export default class NewsPlugin extends Plugin {
	settings: Settings;

	// Executed when Plugin starts (Obsidian opens)
	async onload() {
		await this.loadSettings();
		const newsLogo = this.settings.newsLogo;

		// This calls the menu where the user can change the parameters
		this.addSettingTab(new SettingsMenu(this.app, this));

		// Add custom ribbon to library
		addIcon('New', `<text x="50" y="70" font-size="45" text-anchor="middle" fill="white">NEW</text>`);
		const basePath = (this.app.vault.adapter as any).basePath;

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('New', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice(`The news logo is : ${newsLogo}`);
		});

		// iterates over all files, get their modification dates and check if they contains the new icon
		const files = this.app.vault.getMarkdownFiles();
		for (let i = 0; i < files.length; i++){
			let fPath = files[i].path;
			const pathOfFile = basePath + `\\` + fPath
			const modDate = await getModificationDates(pathOfFile);
			console.log(`File was modified on : ${modDate}`);

			const content = await this.app.vault.cachedRead(files[i]);
			
			if (content.search(newsLogo) != -1){
				console.log(`Found new file : ${fPath}`)
			}
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// Function that gets last modification date of file
async function getModificationDates(pathToExplore: string){
	const stats = await fsp.stat(pathToExplore);
	return stats.mtime;
}

// This creates the menu where the user can change the parameters
export class SettingsMenu extends PluginSettingTab{
	plugin: NewsPlugin;

	constructor(app: App, plugin: NewsPlugin){
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		let {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("NewsLogo")
			.setDesc("Logo utilisé pour marquer les News")
			.addText((text) => 
				text
					.setPlaceholder("Logo des News")
					.setValue(this.plugin.settings.newsLogo)
					.onChange(async (value) => {
						this.plugin.settings.newsLogo = value;
						await this.plugin.saveSettings();
					})
			)
	}
}
