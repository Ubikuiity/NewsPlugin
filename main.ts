import { Console } from 'console';
import { fstat, FSWatcher, Stats } from 'fs';
import { addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SettingTab } from 'obsidian';
import { text } from 'stream/consumers';
import { ExampleView, VIEW_TYPE_EXAMPLE } from "./view";
import * as fsp from 'fs/promises';
// let fsp = require('fs/promises')

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
		// Handle settingsof plugin
		await this.loadSettings();
		const newsLogo = this.settings.newsLogo;

		// Register View
		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf) => new ExampleView(leaf)
		  );

		// This calls the menu where the user can change the parameters
		this.addSettingTab(new SettingsMenu(this.app, this));

		// Add custom ribbon to library
		addIcon('New', `<text x="50" y="70" font-size="45" text-anchor="middle" fill="white">NEW</text>`);
		const basePath = (this.app.vault.adapter as any).basePath;

		// This part creates the ribbon Icon to display the news view
		const ribbonIconEl2 = this.addRibbonIcon('dice', 'News Menu', (evt: MouseEvent) => {
			this.activateMenu();
		})

		// This creates the news Icon
		const ribbonIconEl = this.addRibbonIcon('New', 'News Icon', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice(`The news logo is : ${newsLogo}`);
		});

		// iterates over all files, get their modification dates and check if they contains the new icon
		const files = this.app.vault.getMarkdownFiles();
		for (let i = 0; i < files.length; i++){
			let fPath: string = files[i].path;
			const pathOfFile :string = basePath + `\\` + fPath
			const modDate: Date = await getModificationDate(pathOfFile);
			console.log(`File was modified on : ${modDate}`);

			const content :string = await this.app.vault.cachedRead(files[i]);
			
			if (content.search(newsLogo) != -1){
				console.log(`Found new file : ${fPath}`)
			}
		}
	}

	async activateMenu() {
		// this is to avoid having multiple leaves in the right pane all the same
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);
		
		// this create the leaf on the right pane
		await this.app.workspace.getRightLeaf(false).setViewState({
			type: VIEW_TYPE_EXAMPLE,
			active: true,
		});

		// Reveals the Right Leaf, because it needs user to show it otherwise
		this.app.workspace.revealLeaf(
			this.app.workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE)[0]
		);
	}

	onunload() {
		// this avoid leaving the leaf if the plugin is removed
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// Function that gets last modification date of file
async function getModificationDate(pathToExplore: string): Promise<Date>{
	const stats: Stats = await fsp.stat(pathToExplore);
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
