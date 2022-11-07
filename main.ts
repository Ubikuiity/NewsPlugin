import { addIcon, App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SettingTab, WorkspaceSplit } from 'obsidian';
import { fileCreator } from "filecreator";
import { newIc, newSyncIc } from "icons";
import { exec } from 'child_process';
import { rename, access } from 'fs/promises';
import { fips } from 'crypto';

export interface Settings {
	newsLogo: string;
	newsDelay: number;
	newsFilename: string;
}

const DEFAULT_SETTINGS: Settings = {
	newsLogo: '❄',
	newsDelay: 7,
	newsFilename: 'News.md'
}

export default class NewsPlugin extends Plugin {
	settings: Settings;

	// Executed when Plugin starts (Obsidian opens)
	async onload() {
		// Handle settingsof plugin
		await this.loadSettings();
		const basePath = (this.app.vault.adapter as any).basePath;

		//Create the display Handler
		const displayH = new fileCreator(this.app.vault, this.settings);

		// This calls the menu where the user can change the parameters
		this.addSettingTab(new SettingsMenu(this.app, this));

		// Add custom ribbon to library
		addIcon('New', newIc);
		addIcon('NewSynchro', newSyncIc);

		// This part creates the ribbon Icon to display the news view
		const ribbonIconEl2 = this.addRibbonIcon('NewSynchro', 'News Synchro', (evt: MouseEvent) => {
			displayH.synchroAll();
			new Notice(`reloading news page, please don't spam this button`);
		});

		// This part opens the template file used for news
		const ribbonIconEl3 = this.addRibbonIcon('go-to-file', 'Template News', (evt: MouseEvent) => {
			const tempFile = basePath + `\\.obsidian\\plugins\\FirstPlugin\\Ressources\\NewsTemplate.md`;
			exec(`start notepad++ ${tempFile}`);
		});

		// This creates the news Icon
		const ribbonIconEl = this.addRibbonIcon('New', 'News Icon', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice(`The news logo is : ${this.settings.newsLogo}`);
			const leaves = this.app.workspace.getLeavesOfType('markdown');
			// console.log(this.app.workspace.)
			// for (const leaf of leaves){
			// 	console.log(leaf.getDisplayText());
			// 	console.log(leaf.getContainer());
			// }
			});
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

// This creates the menu where the user can change the parameters
export class SettingsMenu extends PluginSettingTab {
	plugin: NewsPlugin;

	constructor(app: App, plugin: NewsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		let { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("News Logo")
			.setDesc("Icon used to mark news by hand")
			.addText((text) =>
				text
					.setPlaceholder("News icon")
					.setValue(this.plugin.settings.newsLogo)
					.onChange(async (value) => {
						this.plugin.settings.newsLogo = value;
						await this.plugin.saveSettings();
					})
			)

		new Setting(containerEl)
			.setName("News delay")
			.setDesc("Time before considering an article 'not new anymore' (in days)")
			.addText((text) =>
				text
					.setPlaceholder("number of days")
					.setValue(this.plugin.settings.newsDelay.toString())
					.onChange(async (value) => {
						this.plugin.settings.newsDelay = Number(value);
						await this.plugin.saveSettings();
					})
			)

		new Setting(containerEl)
			.setName("News file name")
			.setDesc("Name of the file that will be created to show the news")
			.addText((text) =>
				text
					.setPlaceholder("file name")
					.setValue(this.plugin.settings.newsFilename.toString())
					.onChange(async (value) => {
						const basePath: string = (this.plugin.app.vault.adapter as any).basePath;
						const oldFilePath: string = basePath + '\\' + this.plugin.settings.newsFilename;
						if (value.contains(`.`)) {
							value = value.split(`.`)[0] + `.md`;
						}
						else {
							value = value + `.md`;
						}
						this.plugin.settings.newsFilename = value;
						const newFilePath: string =  basePath + '\\' + value;
						try {
							await access(oldFilePath);
							rename(oldFilePath, newFilePath);
						} catch {
							// News file might not be created yet
						}
						await this.plugin.saveSettings();
					})
			)
	}
}
